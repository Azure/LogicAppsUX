import { environment } from '../../../../environments/environment';
import type { CallbackInfo, ConnectionsData, ParametersData, Workflow } from '../Models/Workflow';
import { Artifact } from '../Models/Workflow';
import { validateResourceId } from '../Utilities/resourceUtilities';
import { convertDesignerWorkflowToConsumptionWorkflow } from './ConsumptionSerializationHelpers';
import type { AllCustomCodeFiles } from '@microsoft/logic-apps-designer';
import { CustomCodeService, LogEntryLevel, LoggerService, equals, getAppFileForFileExtension } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2, VFSObject } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useQuery } from '@tanstack/react-query';
import { isSuccessResponse } from './HttpClient';
import { fetchFileData, fetchFilesFromFolder } from './vfsService';
import type { CustomCodeFileNameMapping } from '@microsoft/logic-apps-designer';
import { HybridAppUtility } from '../Utilities/HybridAppUtilities';
import type { HostingPlanTypes } from '../../../state/workflowLoadingSlice';

const baseUrl = 'https://management.azure.com';
const standardApiVersion = '2020-06-01';
const hybridApiVersion = '2024-02-02-preview';
const consumptionApiVersion = '2019-05-01';

export const useConnectionsData = (appId?: string) => {
  return useQuery(
    ['getConnectionsData', appId],
    async () => {
      const uri = `${baseUrl}/${appId}/workflowsconfiguration/connections?api-version=2018-11-01`;
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
      } catch (error) {
        return {};
      }
    },
    {
      enabled: !!appId,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
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

const getWorkflowAndArtifactsConsumption = async (workflowId: string): Promise<Workflow> => {
  const uri = `${baseUrl}${workflowId}?api-version=${consumptionApiVersion}`;
  const response = await axios.get(uri, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });
  return response.data;
};

export const useRunInstanceStandard = (
  workflowName: string,
  onRunInstanceSuccess: (data: LogicAppsV2.RunInstanceDefinition) => void,
  appId?: string,
  runId?: string
) => {
  return useQuery(
    ['getRunInstance', appId, workflowName, runId],
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
      onSuccess: onRunInstanceSuccess,
    }
  );
};

export const useRunInstanceConsumption = (
  workflowname: string,
  onRunInstanceSuccess: (data: LogicAppsV2.RunInstanceDefinition) => void,
  appId?: string,
  runId?: string
) => {
  return useQuery(
    ['getRunInstance', workflowname, runId],
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
      onSuccess: onRunInstanceSuccess,
    }
  );
};

export const listCallbackUrl = async (
  workflowId: string,
  triggerName: string | undefined,
  isConsumption = false
): Promise<CallbackInfo> => {
  let callbackInfo: any;
  if (triggerName) {
    const authToken = {
      Authorization: `Bearer ${environment.armToken}`,
    };
    if (HybridAppUtility.isHybridLogicApp(workflowId)) {
      callbackInfo = HybridAppUtility.postProxy(`${baseUrl}${workflowId}/triggers/${triggerName}/listCallbackUrl`, null, authToken);
    } else {
      const result = await axios.post(
        `${baseUrl}${workflowId}/triggers/${triggerName}/listCallbackUrl?api-version=${isConsumption ? '2016-10-01' : standardApiVersion}`,
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
};

export const useWorkflowApp = (siteResourceId: string, hostingPlan: HostingPlanTypes) => {
  return useQuery(
    ['workflowApp', siteResourceId],
    async () => {
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
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const useAppSettings = (siteResourceId: string) => {
  return useQuery(
    ['appSettings', siteResourceId],
    async () => {
      if (HybridAppUtility.isHybridLogicApp(siteResourceId)) {
        const containerAppInfo = (
          await axios.get(`${baseUrl}${siteResourceId}?api-version=2024-02-02-preview`, {
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
    },
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
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
  workflowName: string,
  workflow: any,
  connectionsData: ConnectionsData | undefined,
  parametersData: ParametersData | undefined,
  settings: Record<string, string> | undefined,
  customCodeData: AllCustomCodeFiles | undefined,
  clearDirtyState: () => void,
  skipValidation?: boolean
): Promise<any> => {
  const data: any = {
    files: {
      [`${workflowName}/workflow.json`]: workflow,
    },
  };

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
    if (!skipValidation) {
      try {
        await validateWorkflow(siteResourceId, workflowName, workflow, connectionsData, parametersData, settings);
      } catch (error: any) {
        if (error.status !== 404) {
          return;
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
      return;
    }
    clearDirtyState();
  } catch (error) {
    console.log(error);
  }
};

export const saveWorkflowConsumption = async (outdatedWorkflow: Workflow, workflow: any): Promise<any> => {
  const workflowToSave = await convertDesignerWorkflowToConsumptionWorkflow(workflow);

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
  } catch (error) {
    console.log(error);
  }
};

const validateWorkflow = async (
  siteResourceId: string,
  workflowName: string,
  workflow: any,
  connectionsData?: ConnectionsData,
  parametersData?: ParametersData,
  settings?: Record<string, string>,
  isConsumption = false
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
      `${baseUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/validate?api-version=${
        isConsumption ? consumptionApiVersion : standardApiVersion
      }`,
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
