import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
  IConnectionService,
  ILoggerService,
  IOperationManifestService,
  ITemplateResourceService,
  IResourceService,
  Template,
  LogicAppsV2,
} from '@microsoft/logic-apps-shared';
import {
  clone,
  DevLogger,
  InitConnectionService,
  InitLoggerService,
  InitOperationManifestService,
  InitResourceService,
  InitTemplateResourceService,
} from '@microsoft/logic-apps-shared';
import type { RootState } from '../../state/templates/store';
import { getConnectionsInWorkflowApp, getConsumptionWorkflow, getStandardWorkflow } from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import {
  getConnectionKeysInDefinition,
  getLogicAppId,
  getTemplateConnectionsFromConnectionsData,
} from '../../configuretemplate/utils/helper';
import { updateAllWorkflowsData, updateWorkflowData } from '../../state/templates/templateSlice';

export interface ConfigureTemplateServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  loggerService?: ILoggerService;
  resourceService: IResourceService;
  templateResourceService: ITemplateResourceService;
}

export const initializeConfigureTemplateServices = createAsyncThunk(
  'initializeConfigureTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    resourceService,
    templateResourceService,
    loggerService,
  }: ConfigureTemplateServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitResourceService(resourceService);
    InitTemplateResourceService(templateResourceService);

    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);
    return true;
  }
);

export const initializeConnectionsFromWorkflows = createAsyncThunk(
  'initializeConnectionsFromWorkflows',
  async (_: unknown, { getState, dispatch }) => {
    const {
      workflow: { subscriptionId, resourceGroup, isConsumption, logicAppName },
      template: { workflows },
    } = getState() as RootState;

    if (isConsumption) {
      const definition = await getWorkflowDefinitionForConsumption(subscriptionId, resourceGroup, logicAppName as string);
      const connections = await getConnectionsForConsumption(subscriptionId, resourceGroup, logicAppName as string);
      dispatch(
        updateWorkflowData({
          data: {
            id: getLogicAppId(subscriptionId, resourceGroup, logicAppName as string),
            workflowDefinition: definition,
            connectionKeys: Object.keys(connections),
          },
        })
      );
      return connections;
    }

    const allConnections = await getConnectionsForStandard(subscriptionId, resourceGroup, logicAppName as string);
    const workflowIds = Object.keys(workflows).map((id) => workflows[id].id);
    const promises = workflowIds.map((workflowId) => getDefinitionAndUsedConnectionKeys(workflowId));
    const workflowsData = clone(workflows);
    const allWorkflowsData = (await Promise.all(promises))
      .reduce(
        (result: { id: string; kind?: string; definition: LogicAppsV2.WorkflowDefinition; connectionKeys: string[] }[], data, index) => {
          if (data.definition) {
            result.push({ id: workflowIds[index], ...data });
          }
          return result;
        },
        []
      )
      .filter((data) => !!data);

    const connectionsInUse: Record<string, Template.Connection> = {};
    for (const workflowData of allWorkflowsData) {
      const { id: workflowId, definition, connectionKeys } = workflowData;
      workflowsData[workflowId] = {
        ...(workflowsData[workflowId] ?? {}),
        workflowDefinition: definition,
        kind: workflowData.kind,
        connectionKeys,
      };
      connectionKeys.forEach((key) => {
        if (!connectionsInUse[key] && allConnections[key]) {
          connectionsInUse[key] = allConnections[key];
        }
      });
    }

    dispatch(updateAllWorkflowsData(workflowsData));
    return connectionsInUse;
  }
);

const getConnectionsForConsumption = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string
): Promise<Record<string, Template.Connection>> => {
  const queryClient = getReactQueryClient();
  const logicApp = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
  const references = logicApp.properties.parameters?.$connections?.value ?? {};
  return Object.keys(references).reduce((result: Record<string, Template.Connection>, referenceKey) => {
    const { api, id } = references[referenceKey];
    result[referenceKey] = {
      connectorId: api?.id ?? id,
      kind: 'shared',
    };
    return result;
  }, {});
};

const getConnectionsForStandard = async (
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string
): Promise<Record<string, Template.Connection>> => {
  const queryClient = getReactQueryClient();
  const connectionsData = await getConnectionsInWorkflowApp(subscriptionId, resourceGroup, logicAppName, queryClient);
  return getTemplateConnectionsFromConnectionsData(connectionsData);
};

const getWorkflowDefinitionForStandard = async (workflowId: string): Promise<any> => {
  const queryClient = getReactQueryClient();
  const workflow = await getStandardWorkflow(workflowId, queryClient);
  return workflow.properties.files?.['workflow.json'];
};

const getWorkflowDefinitionForConsumption = async (subscriptionId: string, resourceGroup: string, logicAppName: string): Promise<any> => {
  const queryClient = getReactQueryClient();
  const workflow = await getConsumptionWorkflow(subscriptionId, resourceGroup, logicAppName, queryClient);
  return workflow.properties.definition;
};

const getDefinitionAndUsedConnectionKeys = async (
  workflowId: string
): Promise<{ definition: LogicAppsV2.WorkflowDefinition; kind?: string; connectionKeys: string[] }> => {
  const { definition, kind } = await getWorkflowDefinitionForStandard(workflowId);
  const connectionKeys = await getConnectionKeysInDefinition(definition);
  return { definition, kind, connectionKeys };
};
