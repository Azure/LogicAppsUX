import { environment } from '../../../environments/environment';
import type { CallbackInfo, ConnectionsData, ParametersData, Workflow } from '../Models/Workflow';
import { Artifact } from '../Models/Workflow';
import { validateResourceId } from '../Utilities/resourceUtilities';
import { convertDesignerWorkflowToConsumptionWorkflow } from './ConsumptionSerializationHelpers';
import type { VFSObject } from '@microsoft/designer-client-services-logic-apps';
import { CustomCodeService, LogEntryLevel, LoggerService } from '@microsoft/designer-client-services-logic-apps';
import type { CustomCodeFileNameMapping } from '@microsoft/logic-apps-designer';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useQuery } from 'react-query';

const baseUrl = 'https://management.azure.com';
const standardApiVersion = '2020-06-01';
const consumptionApiVersion = '2019-05-01';

export const useWorkflowAndArtifactsStandard = (workflowId: string) => {
  return useQuery(
    ['workflowArtifactsStandard', workflowId],
    async () => {
      const artifacts = [Artifact.ConnectionsFile, Artifact.ParametersFile];
      const uri = `${baseUrl}${validateResourceId(workflowId)}?api-version=${standardApiVersion}&$expand=${artifacts.join(',')}`;
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

export const useAllCustomCodeFiles = (appId?: string, workflowName?: string) => {
  return useQuery(['workflowCustomCode', workflowName], async () => await getAllCustomCodeFiles(appId, workflowName), {
    enabled: !!appId && !!workflowName,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

const getAllCustomCodeFiles = async (appId?: string, workflowName?: string) => {
  const customCodeFiles: Record<string, string> = {};
  const uri = `${baseUrl}${appId}/hostruntime/admin/vfs/${workflowName}`;
  const vfsObjects: VFSObject[] = (
    await axios.get<VFSObject[]>(uri, {
      headers: {
        Authorization: `Bearer ${environment.armToken}`,
      },
      params: {
        relativePath: 1,
        'api-version': '2018-11-01',
      },
    })
  ).data.filter((file) => file.name !== Artifact.WorkflowFile);

  const filesData = await Promise.all(
    vfsObjects.map(async (file) => {
      const response = await axios.get<string>(`${uri}/${file.name}`, {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
          'If-Match': ['*'],
        },
        params: {
          relativePath: 1,
          'api-version': '2018-11-01',
        },
      });
      return { name: file.name, data: response.data };
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

export const listCallbackUrl = async (
  workflowId: string,
  triggerName: string | undefined,
  isConsumption = false
): Promise<CallbackInfo> => {
  let callbackInfo: any;
  if (triggerName) {
    const result = await axios.post(
      `${baseUrl}${workflowId}/triggers/${triggerName}/listCallbackUrl?api-version=${isConsumption ? '2016-10-01' : standardApiVersion}`,
      null,
      {
        headers: {
          Authorization: `Bearer ${environment.armToken}`,
        },
      }
    );
    callbackInfo = result.data;
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

export const useWorkflowApp = (siteResourceId: string, isConsumption = false) => {
  return useQuery(
    ['workflowApp', siteResourceId],
    async () => {
      const uri = `${baseUrl}${siteResourceId}?api-version=${!isConsumption ? '2018-11-01' : '2016-10-01'}`;
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
      const uri = `${baseUrl}${siteResourceId}/config/appsettings/list?api-version=2018-11-01`;
      const response = await axios.post(uri, null, {
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

export const saveCustomCodeStandard = async (customCode?: CustomCodeFileNameMapping): Promise<void> => {
  if (!customCode) return;
  try {
    const existingFiles = (await CustomCodeService().getAllCustomCodeFiles()).map((file) => file.name);
    // to prevent 404's we first check which custom code files are already present before deleting
    Object.entries(customCode).forEach(([fileName, customCodeData]) => {
      const { fileExtension, isModified, isDeleted, fileData } = customCodeData;
      if (isDeleted && existingFiles.includes(fileName)) {
        CustomCodeService().deleteCustomCode(fileName);
        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: 'serializeCustomcode',
          message: `Deleting custom code file: ${fileName}`,
        });
      } else if (isModified) {
        // const fileNameWithoutExtension = replaceWhiteSpaceWithUnderscore(idReplacements[nodeId] ?? nodeId);
        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: 'serializeCustomcode',
          message: `Uploading/Updating custom code file: ${fileName}`,
        });

        CustomCodeService().uploadCustomCode({
          fileData,
          fileName,
          fileExtension,
        });
      }
    });
    return;
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
  customCodeData: CustomCodeFileNameMapping | undefined
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
    try {
      await validateWorkflow(siteResourceId, workflowName, workflow, connectionsData, parametersData, settings);
    } catch (error: any) {
      if (error.status !== 404) {
        return;
      }
    }

    // saving custom code must happen synchronously with deploying the workflow artifacts as they both cause
    // the host to go soft restart. We may need to look into if there's a race case where this may still happen
    saveCustomCodeStandard(customCodeData);
    await axios.post(`${baseUrl}${siteResourceId}/deployWorkflowArtifacts?api-version=${standardApiVersion}`, data, {
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

  const response = await axios.post(
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

  if (response.status !== 200) {
    return Promise.reject(response);
  }
};
