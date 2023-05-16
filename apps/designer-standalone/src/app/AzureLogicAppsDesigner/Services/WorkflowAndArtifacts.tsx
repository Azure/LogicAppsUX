import { environment } from '../../../environments/environment';
import type { CallbackInfo, ConnectionsData, ParametersData, Workflow } from '../Models/Workflow';
import { Artifact } from '../Models/Workflow';
import { validateResourceId } from '../Utilities/resourceUtilities';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useQuery } from 'react-query';

const consumptionApiVersion = '2019-05-01';
const standardApiVersion = '2020-06-01';
export const useWorkflowAndArtifactsStandard = (workflowId: string) => {
  return useQuery(
    ['workflowArtifactsStandard', workflowId],
    async () => {
      const artifacts = [Artifact.ConnectionsFile, Artifact.ParametersFile];
      const uri = `https://management.azure.com${validateResourceId(workflowId)}?api-version=2020-06-01&$expand=${artifacts.join(',')}`;
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
        `https://management.azure.com${appId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/runs/${runId}?api-version=2018-11-01&$expand=properties/actions,workflow/properties`,
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

export const useWorkflowAndArtifactsConsumption = (workflowId: string) => {
  return useQuery(['workflowArtifactsConsumption', workflowId], () => getWorkflowAndArtifactsConsumption(workflowId), {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

const getWorkflowAndArtifactsConsumption = async (workflowId: string): Promise<Workflow> => {
  // const artifacts = ['properties/connectionParameters', 'properties/swagger'];
  // const uri = `${workflowId}?api-version=${consumptionApiVersion}&$expand=${artifacts.join(',')}`;
  const uri = `https://management.azure.com${workflowId}?api-version=${consumptionApiVersion}`;
  const response = await axios.get(uri, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });
  return response.data;
};

export const listCallbackUrl = async (
  workflowId: string,
  triggerName: string | undefined,
  isConsumption = false
): Promise<CallbackInfo> => {
  let callbackInfo: any;
  if (triggerName) {
    const result = await axios.post(
      `https://management.azure.com${workflowId}/triggers/${triggerName}/listCallbackUrl?api-version=${
        isConsumption ? '2016-10-01' : standardApiVersion
      }`,
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
    callbackUri = new URL(callbackInfo.basePath, validateResourceId(callbackInfo.relativePath));
    Object.entries(callbackInfo.queries).forEach(([key, value]) =>
      callbackUri.searchParams.append(encodeURIComponent(key), encodeURIComponent((value as any) ?? ''))
    );
  } else {
    callbackUri = callbackInfo.value;
  }

  return {
    method: callbackInfo.method,
    value: callbackUri.toString(),
  };
};

export const useWorkflowApp = (siteResourceId: string) => {
  return useQuery(
    ['workflowApp', siteResourceId],
    async () => {
      const uri = `https://management.azure.com${siteResourceId}?api-version=2018-11-01`;
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
      const uri = `https://management.azure.com${siteResourceId}/config/appsettings/list?api-version=2018-11-01`;
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

export const getConnectionStandard = async (connectionId: string) => {
  const response = await axios.get(`https://management.azure.com${connectionId}?api-version=2018-07-01-preview`, {
    headers: {
      Authorization: `Bearer ${environment.armToken}`,
    },
  });

  return response.data;
};

export const saveWorkflowStandard = async (
  siteResourceId: string,
  workflowName: string,
  workflow: any,
  connectionsData: ConnectionsData | undefined,
  parametersData: ParametersData | undefined,
  settings: Record<string, string> | undefined
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

    await axios.post(`https://management.azure.com${siteResourceId}/deployWorkflowArtifacts?api-version=${standardApiVersion}`, data, {
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
  const requestPayload = { properties: workflow };

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
    `https://management.azure.com${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/validate?api-version=${
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
