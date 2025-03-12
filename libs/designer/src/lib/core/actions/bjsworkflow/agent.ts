// Custom Logic for adding agent connectors as operations
import type { OperationActionData } from '@microsoft/designer-ui';
import Constants from '../../../common/constants';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import { changePanelNode, setIsPanelLoading } from '../../state/panel/panelSlice';
import { addResultSchema } from '../../state/staticresultschema/staticresultsSlice';
import { addNode, setFocusNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import {
  getCustomSwaggerIfNeeded,
  getInputParametersFromManifest,
  getOutputParametersFromManifest,
  updateAllUpstreamNodes,
} from './initialize';
import { getOperationSettings } from './settings';
import { SearchService, SettingScope, StaticResultService } from '@microsoft/logic-apps-shared';
import type { Connector, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';
import { addTokensAndVariables, getNonDuplicateNodeId } from './add';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import type { WorkflowKind } from '../../state/workflow/workflowInterfaces';

type AddConnectorAsOpreationPayload = {
  connector?: Connector;
  actionData?: OperationActionData[];
  relationshipIds: RelationshipIds;
};

export const ConnectorManifest = {
  // iconUri: Dynamically Added
  // brandColor: Dynamically Added
  properties: {
    // description: Dynamically Added
    // summary: Dynamically Added

    inputs: {
      type: 'object',
      required: ['operations'],
      properties: {
        operations: {
          title: 'Operations',
          description: 'Enter operations of a connector that the agent can perform',
          required: true,
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            // options: Dynamically Added
            multiSelect: true,
            rawValue: true,
          },
        },
        connector: {
          title: 'Connector',
          description: 'The connector to use for the operation',
          required: true,
          type: 'string',
          'x-ms-visibility': 'internal',
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          title: 'Result',
          description: 'The return value of the connector operations',
        },
      },
    },
    isOutputsOptional: false,

    // connector: Dynamically Added

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

// used when creating agent connectors plugins
export const addConnectorAsOperation = createAsyncThunk(
  'addConnectorAsOperation',
  async (payload: AddConnectorAsOpreationPayload, { dispatch, getState }) => {
    batch(() => {
      const { connector, actionData, relationshipIds } = payload;
      if (!connector) {
        throw new Error('Connector does not exist'); // Just an optional catch, should never happen
      }
      const { name, properties, id } = connector;
      const { iconUri, brandColor = Constants.DEFAULT_BRAND_COLOR, description = '', displayName } = properties;
      const workflowState = (getState() as RootState).workflow;
      const nodeId = getNonDuplicateNodeId(workflowState.nodesMetadata, displayName, workflowState.idReplacements);

      const connectorOperation = {
        name,
        id: name,
        type: Constants.NODE.TYPE.CONNECTOR,
        properties: {
          api: {
            id: id,
            name: id,
            brandColor,
            description,
            displayName,
            iconUri,
          },
          summary: name,
          description,
          visibility: 'Important',
          operationType: Constants.NODE.TYPE.CONNECTOR,
          brandColor,
          iconUri,
        },
      };

      dispatch(addNode({ operation: connectorOperation, relationshipIds, nodeId }));

      const nodeOperationInfo = {
        connectorId: id,
        operationId: name,
        type: Constants.NODE.TYPE.CONNECTOR,
      };

      dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));

      initilaizeConnectorAsOperationDetails(nodeId, connector, nodeOperationInfo, actionData, getState as () => RootState, dispatch);

      dispatch(setFocusNode(nodeId));
    });
  }
);

const initilaizeConnectorAsOperationDetails = async (
  nodeId: string,
  connector: Connector,
  operationInfo: NodeOperation,
  actionData: OperationActionData[] | undefined,
  getState: () => RootState,
  dispatch: Dispatch
): Promise<void> => {
  const state = getState();
  const staticResultService = StaticResultService();

  dispatch(setIsPanelLoading(true));
  dispatch(changePanelNode(nodeId));

  const initData = await createNodeData(nodeId, connector, actionData ?? [], operationInfo, state.workflow.workflowKind, dispatch);

  dispatch(initializeNodes({ nodes: [initData] }));
  addTokensAndVariables(nodeId, Constants.NODE.TYPE.CONNECTOR, { ...initData }, state, dispatch);

  dispatch(setIsPanelLoading(false));

  staticResultService.getOperationResultSchema(connector.id, connector.name).then((schema) => {
    if (schema) {
      dispatch(addResultSchema({ id: `${connector.id}-${connector.name}`, schema: schema }));
    }
  });

  updateAllUpstreamNodes(getState() as RootState, dispatch);
};

export const initializeConnectorOperationDetails = async (
  nodeId: string,
  _operation: LogicAppsV2.ConnectorAction,
  workflowKind: WorkflowKind,
  dispatch: Dispatch
): Promise<NodeDataWithOperationMetadata[] | undefined> => {
  const { inputs } = _operation;
  const { connector: connectorId } = inputs ?? {};

  const connector = (await SearchService().getAllConnectors()).find((c) => c.id === connectorId);
  if (connector) {
    const { id, name } = connector;
    const operationInfo = {
      connectorId: id,
      operationId: name,
      type: Constants.NODE.TYPE.CONNECTOR,
    };

    const actionData =
      (await SearchService().getAgentConnectorOperation?.(connectorId))?.map((a) => ({ id: a.id, title: a.properties.summary })) ?? [];
    const manifest = populateManifestWithActionData(connector, actionData);
    dispatch(initializeOperationInfo({ id: nodeId, ...operationInfo }));
    const nodeData = await createNodeData(nodeId, connector, actionData, operationInfo, workflowKind, dispatch, _operation);

    const promise = { ...nodeData, manifest, operationInfo };
    return [promise];
  }

  return [];
};

function populateManifestWithActionData(connector: any, actionData: { title: string; id: string }[]): any {
  const iconUri = connector?.properties?.iconUri;
  const brandColor = connector?.properties?.brandColor ?? Constants.DEFAULT_BRAND_COLOR;

  return {
    ...ConnectorManifest,
    brandColor,
    iconUri,
    properties: {
      ...ConnectorManifest.properties,
      description: connector?.properties?.description,
      summary: connector?.properties?.displayName,
      inputs: {
        ...ConnectorManifest.properties.inputs,
        properties: {
          ...ConnectorManifest.properties.inputs.properties,
          operations: {
            ...ConnectorManifest.properties.inputs.properties.operations,
            'x-ms-editor-options': {
              ...ConnectorManifest.properties.inputs.properties.operations['x-ms-editor-options'],
              options: actionData?.map((action) => ({
                displayName: action.title,
                value: action.id,
              })),
            },
          },
          connector: {
            ...ConnectorManifest.properties.inputs.properties.connector,
            default: connector.id,
          },
        },
      },
    },
  };
}

async function createNodeData(
  nodeId: string,
  connector: Connector,
  actionData: { title: string; id: string }[],
  operationInfo: NodeOperation,
  workflowKind: WorkflowKind,
  dispatch: Dispatch,
  _operation?: LogicAppsV2.ConnectorAction
): Promise<NodeData> {
  const operation = { ..._operation };
  const iconUri = connector?.properties?.iconUri;
  const brandColor = connector?.properties?.brandColor ?? Constants.DEFAULT_BRAND_COLOR;

  const manifest = populateManifestWithActionData(connector, actionData ?? []);
  const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, operation);
  const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(
    nodeId,
    operationInfo,
    manifest,
    undefined,
    customSwagger,
    operation
  );

  const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
    nodeId,
    manifest,
    false,
    nodeInputs,
    operationInfo,
    dispatch
  );

  const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
  const settings = getOperationSettings(false, operationInfo, manifest, /* swagger */ undefined, /* operation */ undefined, workflowKind);

  return {
    id: nodeId,
    nodeInputs,
    nodeOutputs,
    nodeDependencies,
    settings,
    operationMetadata: { iconUri, brandColor },
  };
}
