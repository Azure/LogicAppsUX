import { environment } from '../../../../environments/environment';
import type { CallbackInfo, ConnectionsData, ParametersData, Workflow } from '../Models/Workflow';
import { Artifact } from '../Models/Workflow';
import { validateResourceId } from '../Utilities/resourceUtilities';
import { convertDesignerWorkflowToConsumptionWorkflow } from './ConsumptionSerializationHelpers';
import { getReactQueryClient, runsQueriesKeys, type AllCustomCodeFiles } from '@microsoft/logic-apps-designer';
import { CustomCodeService, LogEntryLevel, LoggerService, equals, getAppFileForFileExtension } from '@microsoft/logic-apps-shared';
import type { AgentQueryParams, AgentURL, LogicAppsV2, VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useQuery } from '@tanstack/react-query';
import { isSuccessResponse } from './HttpClient';
import { fetchFileData, fetchFilesFromFolder } from './vfsService';
import type { CustomCodeFileNameMapping } from '@microsoft/logic-apps-designer';
import { HybridAppUtility, hybridApiVersion } from '../Utilities/HybridAppUtilities';
import type { HostingPlanTypes } from '../../../state/workflowLoadingSlice';
import { ArmParser } from '../Utilities/ArmParser';

const baseUrl = 'https://management.azure.com';
const standardApiVersion = '2020-06-01';
const consumptionApiVersion = '2019-05-01';

export const useConnectionsData = (appId?: string, enabled = true) => {
  return useQuery(['getConnectionsData', appId], async () => getConnectionsData(appId as string), {
    enabled: !!appId && enabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

export const getConnectionsData = async (appId: string): Promise<ConnectionsData> => {
  const uri = `${baseUrl}${appId}/workflowsconfiguration/connections?api-version=2018-11-01`;
  try {
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    const { files, health } = response.data.properties;
    if (equals(health.state, 'healthy')) {
      return files['connections.json'];
    }
    const { error } = health;
    throw new Error(error.message);
  } catch {
    return {};
  }
};

export const useWorkflowAndArtifactsStandard = (workflowId: string) => {
  return useQuery(
    ['workflowArtifactsStandard', workflowId],
    async () => {
      const artifacts = [Artifact.ConnectionsFile, Artifact.ParametersFile];
      const uri = `${baseUrl}${validateResourceId(workflowId)}?api-version=${
        HybridAppUtility.isHybridLogicApp(workflowId) ? hybridApiVersion : standardApiVersion
      }&$expand=${artifacts.join(',')}`;
      const response = await axios.get(uri, {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
          'if-match': '*',
        },
      });

      return response.data;
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const useAllCustomCodeFiles = (appId?: string, workflowName?: string, isHybridLogicApp?: boolean) => {
  return useQuery(
    ['workflowCustomCode', appId, workflowName],
    async () => await getAllCustomCodeFiles(appId, workflowName, isHybridLogicApp),
    {
      enabled: !!appId && !!workflowName,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

interface HostJSON {
  managedDependency?: {
    enabled: boolean;
  };
  version?: string;
  extensionBundle?: {
    id?: string;
    version?: string;
  };
}

// we want to eventually move this logic to the backend that way we don't increase save time fetching files
export const getCustomCodeAppFiles = async (
  appId?: string,
  customCodeFiles?: CustomCodeFileNameMapping
): Promise<Record<string, string>> => {
  // only powershell files have custom app files
  // to reduce the number of requests, we only check if there are any modified powershell files
  if (!customCodeFiles || !Object.values(customCodeFiles).some((file) => file.isModified && file.fileExtension === '.ps1')) {
    return {};
  }
  const appFiles: Record<string, string> = {};
  const uri = `${baseUrl}${appId}/hostruntime/admin/vfs`;
  const vfsObjects: VFSObject[] = await fetchFilesFromFolder(uri);
  if (vfsObjects.find((file) => file.name === 'host.json')) {
    try {
      const response = await fetchFileData<HostJSON>(`${uri}/host.json`);
      if (!response.managedDependency?.enabled) {
        response.managedDependency = {
          enabled: true,
        };
        appFiles['host.json'] = JSON.stringify(response, null, 2);
      }
    } catch (error) {
      const errorMessage = `Failed to parse Host.json: ${error}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'serializeCustomcode',
        message: errorMessage,
        error: error instanceof Error ? error : undefined,
      });
    }
  }
  if (!vfsObjects.find((file) => file.name === 'requirements.psd1')) {
    appFiles['requirements.psd1'] = getAppFileForFileExtension('.ps1');
  }
  return appFiles;
};

const getAllCustomCodeFiles = async (
  appId?: string,
  workflowName?: string,
  isHybridLogicApp?: boolean
): Promise<Record<string, string>> => {
  if (isHybridLogicApp) {
    return {};
  }
  const customCodeFiles: Record<string, string> = {};
  const uri = `${baseUrl}${appId}/hostruntime/admin/vfs/${workflowName}`;
  const vfsObjects: VFSObject[] = (await fetchFilesFromFolder(uri)).filter((file) => file.name !== Artifact.WorkflowFile);

  const filesData = await Promise.all(
    vfsObjects.map(async (file) => {
      const response = await fetchFileData<string>(`${uri}/${file.name}`);
      return { name: file.name, data: response };
    })
  );

  filesData.forEach((file) => {
    customCodeFiles[file.name] = file.data;
  });

  return customCodeFiles;
};

export const useWorkflowAndArtifactsConsumption = (workflowId: string) => {
  return useQuery(['workflowArtifactsConsumption', workflowId], () => getWorkflowAndArtifactsConsumption(workflowId), {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

export const getWorkflowAndArtifactsConsumption = async (workflowId: string): Promise<Workflow> => {
  const uri = `${baseUrl}${workflowId}?api-version=${consumptionApiVersion}`;
  const response = await axios.get(uri, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });
  return response.data;
};

export const useRunInstanceStandard = (workflowName: string, appId?: string, runId?: string) => {
  return useQuery(
    [runsQueriesKeys.useRunInstance, appId, workflowName, runId],
    async () => {
      if (!appId) {
        return;
      }
      if (HybridAppUtility.isHybridLogicApp(appId)) {
        return HybridAppUtility.getProxy<LogicAppsV2.RunInstanceDefinition>(
          `${baseUrl}${appId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/runs/${runId}?$expand=properties/actions,workflow/properties`,
          null,
          {
            Authorization: `Bearer ${environment.armToken}`,
          }
        );
      }

      const results = await axios.get<LogicAppsV2.RunInstanceDefinition>(
        `${baseUrl}${appId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/runs/${runId}?api-version=2018-11-01&$expand=properties/actions,workflow/properties`,
        {
          headers: {
            Authorization: `Bearer ${environment.armToken}`,
          },
        }
      );
      return results.data;
    },
    {
      enabled: !!workflowName && !!runId,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const useRunInstanceConsumption = (workflowname: string, appId?: string, runId?: string) => {
  return useQuery(
    [runsQueriesKeys.useRunInstance, workflowname, runId],
    async () => {
      const results = await axios.get<LogicAppsV2.RunInstanceDefinition>(
        `${baseUrl}${appId}/runs/${runId}?api-version=${consumptionApiVersion}&$expand=properties/actions,workflow/properties`,
        {
          headers: {
            Authorization: `Bearer ${environment.armToken}`,
          },
        }
      );
      return results.data;
    },
    {
      enabled: !!workflowname && !!runId,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const listCallbackUrl = async (
  workflowId: string,
  triggerName: string | undefined,
  isConsumption = false
): Promise<CallbackInfo> => {
  return getReactQueryClient().fetchQuery(['callbackUrl', { triggerName }], async () => {
    let callbackInfo: any;
    if (triggerName) {
      const authToken = {
        Authorization: `Bearer ${environment.armToken}`,
      };
      if (HybridAppUtility.isHybridLogicApp(workflowId)) {
        callbackInfo = await HybridAppUtility.postProxy(`${baseUrl}${workflowId}/triggers/${triggerName}/listCallbackUrl`, null, authToken);
      } else {
        const result = await axios.post(
          `${baseUrl}${workflowId}/triggers/${triggerName}/listCallbackUrl?api-version=${
            isConsumption ? '2016-10-01' : standardApiVersion
          }`,
          null,
          {
            headers: {
              ...authToken,
            },
          }
        );
        callbackInfo = result.data;
      }
    } else {
      callbackInfo = {
        basePath: '',
        method: '',
        queries: {},
        value: '',
      };
    }

    let callbackUri: URL;
    if (callbackInfo.relativePath) {
      callbackUri = new URL(`${callbackInfo.basePath}${validateResourceId(callbackInfo.relativePath)}`);
      Object.entries(callbackInfo.queries).forEach(([key, value]) => callbackUri.searchParams.append(key, (value as any) ?? ''));
    } else {
      callbackUri = callbackInfo.value;
    }

    return {
      method: callbackInfo.method,
      value: callbackUri.toString(),
    };
  });
};

// Helper function to fetch A2A authentication key
const fetchA2AAuthKey = async (siteResourceId: string, workflowName: string) => {
  const response = await axios.post(
    `${baseUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/listApiKeys?api-version=2018-11-01`,
    {
      expiry: undefined,
      keyType: 'Primary',
    },
    {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    }
  );
  return response.data;
};

// Helper function to fetch OBO (On-Behalf-Of) data
const fetchOBOData = async (siteResourceId: string) => {
  try {
    const connectionsResponse = await axios.get(`${baseUrl}${siteResourceId}/workflowsconfiguration/connections?api-version=2018-11-01`, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    const connectionsData = connectionsResponse.data.properties.files['connections.json'];

    // Find dynamic connection
    const apiConnections = connectionsData?.managedApiConnections ?? {};
    let connectionId = '';
    for (const key of Object.keys(apiConnections)) {
      if (equals(apiConnections[key].runtimeSource ?? '', 'Dynamic', true)) {
        connectionId = apiConnections[key].connection.id;
        break;
      }
    }

    if (connectionId) {
      const oboResponse = await axios.post(`${baseUrl}${connectionId}/listDynamicConnectionKeys?api-version=2020-06-01`, null, {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
        },
      });
      return oboResponse.data;
    }
    return null;
  } catch (error) {
    // OBO is optional, continue without it
    LoggerService().log({
      level: LogEntryLevel.Error,
      message: `Failed to get OBO data: ${error}`,
      area: 'fetchAgentUrl',
    });
    return null;
  }
};

// Async function to get Agent URL with authentication tokens (uses React Query for memoization)
export const fetchAgentUrl = (siteResourceId: string, workflowName: string, hostName: string): Promise<AgentURL> => {
  const queryClient = getReactQueryClient();

  return queryClient.fetchQuery(['agentUrl', siteResourceId, workflowName, hostName], async (): Promise<AgentURL> => {
    if (!workflowName || !hostName) {
      return { agentUrl: '', chatUrl: '', hostName: '' };
    }

    try {
      // Get A2A authentication key
      const a2aData = await fetchA2AAuthKey(siteResourceId, workflowName);

      // Get OBO data if available
      const oboData = await fetchOBOData(siteResourceId);

      const agentBaseUrl = hostName.startsWith('https://') ? hostName : `https://${hostName}`;
      const agentUrl = `${agentBaseUrl}/api/Agents/${workflowName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      let queryParams: AgentQueryParams | undefined = undefined;

      // Add authentication tokens if available
      const a2aKey = a2aData?.key;
      if (a2aKey) {
        queryParams = { apiKey: a2aKey };

        // Add OBO token if available
        const oboKey = oboData?.properties?.key;
        if (oboKey) {
          queryParams.oboToken = oboKey;
        }
      }

      return {
        agentUrl,
        chatUrl,
        queryParams,
        hostName,
      };
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        message: `Failed to get agent URL: ${error}`,
        area: 'fetchAgentUrl',
      });
      return { agentUrl: '', chatUrl: '', hostName };
    }
  });
};

export const useWorkflowApp = (siteResourceId: string, hostingPlan: HostingPlanTypes, enabled = true) => {
  return useQuery(['workflowApp', siteResourceId], async () => getWorkflowApp(siteResourceId, hostingPlan), {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled,
  });
};

export const getWorkflowAppFromCache = async (siteResourceId: string, hostingPlan: HostingPlanTypes) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['workflowApp', siteResourceId], async () => getWorkflowApp(siteResourceId, hostingPlan));
};

const getWorkflowApp = async (siteResourceId: string, hostingPlan: HostingPlanTypes) => {
  const apiVersions = {
    consumption: '2016-10-01',
    standard: '2018-11-01',
    hybrid: '2023-11-02-preview',
  };
  const uri = `${baseUrl}${siteResourceId}?api-version=${apiVersions[hostingPlan] || '2018-11-01'}`;
  const response = await axios.get(uri, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });

  return response.data;
};

export const useAppSettings = (siteResourceId: string) => {
  return useQuery(['appSettings', siteResourceId], async () => getAppSettings(siteResourceId), {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

export const getAppSettings = async (siteResourceId: string) => {
  if (HybridAppUtility.isHybridLogicApp(siteResourceId)) {
    const containerAppInfo = (
      await axios.get(`${baseUrl}${siteResourceId}?api-version=${hybridApiVersion}`, {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
        },
      })
    ).data;
    containerAppInfo.properties = containerAppInfo.properties.template.containers[0].env;
    containerAppInfo.properties = containerAppInfo.properties.reduce((acc: any, cur: any) => {
      acc[cur.name] = cur.value;
      return acc;
    }, {});
    return containerAppInfo;
  }

  const uri = `${baseUrl}${siteResourceId}/config/appsettings/list?api-version=2018-11-01`;
  return (
    await axios.post(uri, null, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
    })
  ).data;
};

export const useCurrentTenantId = () => {
  return useQuery(
    ['tenantId'],
    async () => {
      const jwt = jwt_decode<{ tid: string }>(environment.armToken ?? '');
      return jwt.tid;
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const useCurrentObjectId = () => {
  return useQuery(
    ['objectId'],
    async () => {
      const jwt = jwt_decode<{ oid: string }>(environment.armToken ?? '');
      return jwt.oid;
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const getConnectionStandard = async (connectionId: string) => {
  const response = await axios.get(`${baseUrl}${connectionId}?api-version=2018-07-01-preview`, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });

  return response.data;
};

export const getConnectionConsumption = async (connectionId: string) => {
  const response = await axios.get(`${baseUrl}${connectionId}?api-version=2018-07-01-preview`, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });

  return response.data;
};

export const saveCustomCodeStandard = async (allCustomCodeFiles?: AllCustomCodeFiles): Promise<void> => {
  const { customCodeFiles: customCode, appFiles } = allCustomCodeFiles ?? {};
  if (!customCode || Object.keys(customCode).length === 0) {
    return;
  }
  try {
    // to prevent 404's we first check which custom code files are already present before deleting
    Object.entries(customCode).forEach(([fileName, customCodeData]) => {
      const { fileExtension, isModified, isDeleted, fileData } = customCodeData;
      if (isDeleted) {
        CustomCodeService().deleteCustomCode(fileName);
        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: 'serializeCustomcode',
          message: `Deleting custom code file: ${fileName}`,
        });
      } else if (isModified && fileData) {
        CustomCodeService().uploadCustomCode({
          fileData,
          fileName,
          fileExtension,
        });
        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: 'serializeCustomcode',
          message: `Uploading/Updating custom code file: ${fileName}`,
        });
      }
    });
    Object.entries(appFiles ?? {}).forEach(([fileName, fileData]) => CustomCodeService().uploadCustomCodeAppFile({ fileName, fileData }));
  } catch (error) {
    const errorMessage = `Failed to save custom code: ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'serializeCustomcode',
      message: errorMessage,
      error: error instanceof Error ? error : undefined,
    });
    return;
  }
};

export const saveWorkflowStandard = async (
  siteResourceId: string,
  workflows: {
    name: string;
    workflow: any;
  }[],
  connectionsData: ConnectionsData | undefined,
  parametersData: ParametersData | undefined,
  settings: Record<string, string> | undefined,
  customCodeData: AllCustomCodeFiles | undefined,
  clearDirtyState: () => void,
  options?: {
    skipValidation?: boolean;
    throwError?: boolean;
  }
): Promise<any> => {
  const data: any = {
    files: {},
  };

  for (const { name, workflow } of workflows) {
    data.files[`${name}/workflow.json`] = workflow;
  }

  if (connectionsData) {
    data.files['connections.json'] = connectionsData;
  }

  if (parametersData) {
    data.files['parameters.json'] = parametersData;
  }

  if (settings) {
    data.appSettings = settings;
  }

  try {
    if (!options?.skipValidation) {
      for (const { name, workflow } of workflows) {
        try {
          await validateWorkflowStandard(siteResourceId, name, workflow, connectionsData, parametersData, settings);
        } catch (error: any) {
          if (error.status !== 404) {
            return;
          }
        }
      }
    }

    // saving custom code must happen synchronously with deploying the workflow artifacts as they both cause
    // the host to go soft restart. We may need to look into if there's a race case where this may still happen
    // eventually we want to move this logic to the backend to happen with deployWorkflowArtifacts
    saveCustomCodeStandard(customCodeData);

    let url = null;
    if (HybridAppUtility.isHybridLogicApp(siteResourceId)) {
      url = `${baseUrl}${HybridAppUtility.getHybridAppBaseRelativeUrl(
        siteResourceId
      )}/deployWorkflowArtifacts?api-version=${hybridApiVersion}`;
    } else {
      url = `${baseUrl}${siteResourceId}/deployWorkflowArtifacts?api-version=${standardApiVersion}`;
    }
    const response = await axios.post(url, data, {
      headers: {
        'If-Match': '*',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.armToken}`,
      },
    });

    if (!isSuccessResponse(response.status)) {
      alert('Failed to save workflow');
      if (options?.throwError) {
        throw Error('Failed to save workflow');
      }
      return;
    }
    clearDirtyState();
  } catch (error) {
    console.log(error);
    if (options?.throwError) {
      throw error;
    }
  }
};

export const saveWorkflowConsumption = async (
  outdatedWorkflow: Workflow,
  workflow: any,
  clearDirtyState: () => void,
  options?: {
    shouldConvertToConsumption?: boolean /* false when saving from code view*/;
    throwError?: boolean;
  }
): Promise<any> => {
  const shouldConvertToConsumption = options?.shouldConvertToConsumption ?? true;

  const workflowToSave = shouldConvertToConsumption ? await convertDesignerWorkflowToConsumptionWorkflow(workflow) : workflow;

  const outputWorkflow: Workflow = {
    ...outdatedWorkflow,
    properties: {
      ...outdatedWorkflow.properties,
      ...workflowToSave,
    },
  };

  try {
    await axios.put(`${baseUrl}${validateResourceId(outdatedWorkflow.id)}?api-version=2016-10-01`, JSON.stringify(outputWorkflow), {
      headers: {
        'If-Match': '*',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.armToken}`,
      },
    });
    clearDirtyState();
  } catch (error) {
    console.log(error);
    if (options?.throwError) {
      throw error;
    }
  }
};

export const validateWorkflowStandard = async (
  siteResourceId: string,
  workflowName: string,
  workflow: any,
  connectionsData?: ConnectionsData,
  parametersData?: ParametersData,
  settings?: Record<string, string>
): Promise<any> => {
  const requestPayload = { properties: { ...workflow } };

  if (connectionsData) {
    requestPayload.properties.connections = connectionsData;
  }

  if (parametersData) {
    requestPayload.properties.parameters = parametersData;
  }

  if (settings) {
    requestPayload.properties.appsettings = { Values: settings };
  }

  let response = null;
  if (HybridAppUtility.isHybridLogicApp(siteResourceId)) {
    response = await HybridAppUtility.postProxyResponse(
      `${baseUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/validate`,
      requestPayload,
      {
        Authorization: `Bearer ${environment.armToken}`,
      }
    );
  } else {
    response = await axios.post(
      `${baseUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/validate?api-version=${standardApiVersion}`,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${environment.armToken}`,
        },
      }
    );
  }

  if (response.status !== 200) {
    return Promise.reject(response);
  }
};

export const validateWorkflowConsumption = async (
  siteResourceId: string,
  location: string,
  outdatedWorkflow: any,
  workflow: any
): Promise<any> => {
  const { subscriptionId, resourceGroup, topResourceName } = new ArmParser(siteResourceId);
  const logicApp = {
    ...outdatedWorkflow,
    properties: {
      ...outdatedWorkflow?.properties,
      definition: workflow.definition,
      parameters: workflow.parameters,
      connectionReferences: workflow.connectionReferences,
    },
  };
  const response = await axios.post(
    `${baseUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Logic/locations/${location}/workflows/${topResourceName}/validate?api-version=2016-10-01`,
    logicApp,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.armToken}`,
      },
    }
  );

  if (response.status !== 200) {
    return Promise.reject(response);
  }
};
