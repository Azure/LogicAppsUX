import constants from '../../../../../common/constants';
import { useConnectorByNodeId, useShowIdentitySelectorQuery } from '../../../../../core/state/connection/connectionSelector';
import { addOrUpdateCustomCode, renameCustomCodeFile } from '../../../../../core/state/customcode/customcodeSlice';
import { useHostOptions, useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import {
  DynamicLoadStatus,
  ErrorLevel,
  updateAgentParametersInNode,
  updateNodeParameters,
} from '../../../../../core/state/operation/operationMetadataSlice';
import { useDependencies, useNodesInitialized, useOperationErrorInfo } from '../../../../../core/state/operation/operationSelector';
import { useIsPanelInPinnedViewMode, usePanelLocation } from '../../../../../core/state/panel/panelSelectors';
import {
  useAllowUserToChangeConnection,
  useConnectorName,
  useNodeConnectionName,
  useOperationInfo,
} from '../../../../../core/state/selectors/actionMetadataSelector';
import type { AgentParameterDeclaration, VariableDeclaration } from '../../../../../core/state/tokens/tokensSlice';
import { addAgentParameterToNode, updateAgentParameter, updateVariableInfo } from '../../../../../core/state/tokens/tokensSlice';
import {
  useGetSwitchOrAgentParentId,
  useIsWithinAgenticLoop,
  useNodeMetadata,
  useReplacedIds,
} from '../../../../../core/state/workflow/workflowSelectors';
import { useIsA2AWorkflow } from '../../../../../core/state/designerView/designerViewSelectors';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { getConnectionReference } from '../../../../../core/utils/connectors/connections';
import { isTriggerNode } from '../../../../../core/utils/graph';
import {
  getDisplayValueFromPickerSelectedItem,
  getTypeForTokenFiltering,
  getValueFromPickerSelectedItem,
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  loadParameterValueFromString,
  ParameterGroupKeys,
  parameterValueToString,
  remapEditorViewModelWithNewIds,
  remapValueSegmentsWithNewIds,
  shouldEncodeParameterValueForOperationBasedOnMetadata,
  shouldUseParameterInGroup,
  updateParameterAndDependencies,
} from '../../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../../core/utils/tokens';
import { getAvailableVariables } from '../../../../../core/utils/variables';
import { SettingsSection } from '../../../../settings/settingsection';
import type { Settings } from '../../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { IdentitySelector } from './identityselector';
import { FoundryAgentDetails, buildFoundryPortalUrl, NavigateIcon, useFoundryAgentDetailsStyles } from '@microsoft/designer-ui';
import {
  Button,
  Divider,
  Dropdown,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import {
  PanelLocation,
  TokenPicker,
  TokenPickerButtonLocation,
  TokenType,
  convertSegmentsToString,
  convertVariableEditorSegmentsAsSchema,
  createLiteralValueSegment,
  isCustomCodeParameter,
  isInitializeVariableOperation,
  parseSchemaAsVariableEditorSegments,
  toCustomEditorAndOptions,
  type ChangeState,
  type ParameterInfo,
  type ValueSegment,
  type OutputToken,
  type TokenPickerMode,
  type PanelTabFn,
  type PanelTabProps,
  type InitializeVariableProps,
  type NewResourceProps,
} from '@microsoft/designer-ui';
import {
  AGENT_MODEL_CONFIG,
  clone,
  ConnectionService,
  EditorService,
  equals,
  ExtensionProperties,
  getPropertyValue,
  getRecordEntry,
  isNullOrUndefined,
  isRecordNotEmpty,
  RoleService,
  SUBGRAPH_TYPES,
} from '@microsoft/logic-apps-shared';
import type { Connection, Connector, CreateFoundryAgentOptions, FoundryAgentVersion, OperationInfo } from '@microsoft/logic-apps-shared';
import { getMissingRoleDefinitions } from '../../../../../core/queries/role';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { ConnectionInline } from './connectionInline';
import { ConnectionsSubMenu } from './connectionsSubMenu';
import {
  useCognitiveServiceAccountDeploymentsForNode,
  useCognitiveServiceAccountId,
  useFoundryAccountResourceIdForNode,
  useFoundryAgentsForNode,
  useFoundryAgentVersions,
  useFoundryModelsForNode,
  useFoundryProjectEndpointForNode,
  useFoundryProjectResourceIdForNode,
  useCreateFoundryAgent,
} from '../../../connectionsPanel/createConnection/custom/useCognitiveService';
import {
  categorizeConnections,
  getConnectionToAssign,
  getDeploymentIdParameter,
  getFirstDeploymentModelName,
  isAgentConnectorAndAgentModel,
  isAgentConnectorAndAgentServiceModel,
  agentModelTypeParameterKey,
  isAgentConnectorAndDeploymentId,
  isAgentConnectorAndFoundryAgentId,
} from './helpers';
import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { getConnectionsForConnector } from '../../../../../core/queries/connections';
import { updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { removeNodeConnectionData } from '../../../../../core/state/connection/connectionSlice';
import {
  setPendingFoundryUpdate,
  clearPendingFoundryUpdate,
  getPendingFoundryUpdate,
  consumeVersionRefresh,
  needsVersionRefresh,
  setIsWorkflowDirty,
} from '../../../../../core';

// TODO: Add a readonly per settings section/group
export interface ParametersTabProps extends PanelTabProps {
  isTabReadOnly?: boolean;
}

export const ParametersTab: React.FC<ParametersTabProps> = (props) => {
  const { nodeId: selectedNodeId, isTabReadOnly } = props;
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNodeId]);
  const { tokenState, workflowParametersState, workflowState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
    workflowState: state.workflow,
  }));
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const readOnly = useReadOnly() || isTabReadOnly;
  const nodesInitialized = useNodesInitialized();

  const connectionName = useNodeConnectionName(selectedNodeId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const showConnectionDisplay = useAllowUserToChangeConnection(operationInfo);
  const showIdentitySelector = useShowIdentitySelectorQuery(selectedNodeId);
  const errorInfo = useOperationErrorInfo(selectedNodeId);
  const replacedIds = useReplacedIds();
  const switchOrAgentParentInfo = useGetSwitchOrAgentParentId(selectedNodeId);

  const isPaneInPinnedViewMode = useIsPanelInPinnedViewMode();

  const intl = useIntl();

  const emptyParametersMessage = intl.formatMessage({
    defaultMessage: 'No additional information is needed for this step. You will be able to use the outputs in subsequent steps.',
    id: 'BtL7UI',
    description: 'Message to show when there are no parameters to author in operation.',
  });
  const cannotUpdateConnectionIfPinnedMessage = intl.formatMessage({
    defaultMessage: 'Connections cannot be edited in pinned view. Release the pinned action to make connection changes.',
    id: 'rl9UOO',
    description:
      'Descriptive message to show if the connection for an action cannot be changed or edited due to being shown in dual-pane (pinned action) view.',
  });
  const isLoading = useMemo(() => {
    if (!operationInfo && !nodeMetadata?.subgraphType) {
      return true;
    }
    if (!nodesInitialized) {
      return true;
    }
    if (inputs?.dynamicLoadStatus === DynamicLoadStatus.LOADING) {
      return true;
    }
    return false;
  }, [inputs?.dynamicLoadStatus, nodeMetadata?.subgraphType, nodesInitialized, operationInfo]);

  const noVisibleParams = useMemo(() => {
    return !hasParametersToAuthor(inputs?.parameterGroups ?? {});
  }, [inputs?.parameterGroups]);
  const showNoParamsMessage = useMemo(() => {
    const haveDynamicInputsError = errorInfo?.level === ErrorLevel.DynamicInputs;
    return noVisibleParams && !haveDynamicInputsError;
  }, [errorInfo?.level, noVisibleParams]);

  if (isLoading) {
    return (
      <div className="msla-loading-container">
        <Spinner size="large" />
      </div>
    );
  }

  const tokenGroup = getOutputTokenSections(
    switchOrAgentParentInfo?.parentId ?? selectedNodeId,
    switchOrAgentParentInfo?.type ?? nodeType,
    tokenState,
    workflowParametersState,
    workflowState,
    replacedIds
  );
  const expressionGroup = getExpressionTokenSections();

  return (
    <>
      {errorInfo ? (
        <MessageBar
          intent={
            errorInfo.level === ErrorLevel.DynamicInputs || errorInfo.level === ErrorLevel.Default
              ? 'warning'
              : errorInfo.level === ErrorLevel.DynamicOutputs
                ? 'warning'
                : 'error'
          }
          layout="multiline"
        >
          <MessageBarBody>
            <Text>{errorInfo.message}</Text>
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {showNoParamsMessage ? (
        <MessageBar layout="multiline">
          <MessageBarBody>
            <Text>{emptyParametersMessage}</Text>
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {Object.keys(inputs?.parameterGroups ?? {}).map((sectionName) => (
        <div key={sectionName}>
          <ParameterSection
            key={selectedNodeId}
            nodeId={selectedNodeId}
            group={inputs.parameterGroups[sectionName]}
            readOnly={readOnly}
            tokenGroup={tokenGroup}
            expressionGroup={expressionGroup}
          />
        </div>
      ))}
      {operationInfo && showConnectionDisplay && connectionName.isLoading !== undefined ? (
        <>
          <Divider style={{ padding: '16px 0px' }} />
          <ConnectionDisplay
            connectionName={connectionName.result}
            nodeId={selectedNodeId}
            isLoading={connectionName.isLoading}
            readOnly={!!readOnly || isPaneInPinnedViewMode}
            readOnlyReason={isPaneInPinnedViewMode ? cannotUpdateConnectionIfPinnedMessage : undefined}
            hasError={errorInfo?.level === ErrorLevel.Connection}
          />
        </>
      ) : null}
      {!showIdentitySelector.isLoading && showIdentitySelector.result ? (
        <IdentitySelector nodeId={selectedNodeId} readOnly={!!readOnly} />
      ) : null}
    </>
  );
};

const clearConnectionAndDeploymentModel = (
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
  nodeId: string,
  deploymentIdParam: string
): void => {
  dispatch(removeNodeConnectionData({ nodeId }));
  dispatch(
    updateNodeParameters({
      nodeId,
      parameters: [
        {
          groupId: ParameterGroupKeys.DEFAULT,
          parameterId: deploymentIdParam,
          propertiesToUpdate: {
            value: [createLiteralValueSegment('')],
          },
        },
      ],
    })
  );
};

const updateConnectionAndDeployment = async (
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
  nodeId: string,
  connector: Connector,
  connection: Connection,
  deploymentIdParamId: string
): Promise<void> => {
  try {
    // Update connection
    dispatch(
      updateNodeConnection({
        nodeId,
        connection,
        connector,
      })
    );

    ConnectionService().setupConnectionIfNeeded(connection);

    // Get deployment model name
    const deploymentModelName = await getFirstDeploymentModelName(connection);

    // Update deployment model parameter
    dispatch(
      updateNodeParameters({
        nodeId,
        parameters: [
          {
            groupId: ParameterGroupKeys.DEFAULT,
            parameterId: deploymentIdParamId,
            propertiesToUpdate: {
              value: [createLiteralValueSegment(deploymentModelName)],
            },
          },
        ],
      })
    );
  } catch {
    clearConnectionAndDeploymentModel(dispatch, nodeId, deploymentIdParamId);
  }
};

export const dynamicallyLoadAgentConnection = createAsyncThunk(
  'dynamicallyLoadAgentConnection',
  async (
    { nodeId, connector, modelType }: { nodeId: string; connector: Connector; modelType: string },
    { dispatch, getState }
  ): Promise<void> => {
    // Fetch and categorize connections
    const connections = await getConnectionsForConnector(connector.id);
    const categorizedConnections = categorizeConnections(connections);

    // Validate node parameters
    const deploymentIdParam = getDeploymentIdParameter(getState() as RootState, nodeId);
    if (!deploymentIdParam) {
      return;
    }

    // Find appropriate connection for the model type
    const connectionToAssign = getConnectionToAssign(modelType, categorizedConnections.azureOpenAI, categorizedConnections.foundry);

    if (!connectionToAssign) {
      await clearConnectionAndDeploymentModel(dispatch, nodeId, deploymentIdParam.id);
      return;
    }

    // Update connection and deployment model
    await updateConnectionAndDeployment(dispatch, nodeId, connector, connectionToAssign, deploymentIdParam.id);
  }
);

// Stable parameter keys for Foundry-managed fields (not locale-dependent)
const FOUNDRY_DEPLOYMENT_KEY = 'inputs.$.deploymentId';
const FOUNDRY_MESSAGES_KEY = 'inputs.$.messages';
const FOUNDRY_AGENT_KEY = 'inputs.$.foundryAgentId';

export const ParameterSection = ({
  nodeId,
  group,
  readOnly,
  tokenGroup,
  expressionGroup,
}: {
  nodeId: string;
  group: ParameterGroup;
  readOnly: boolean | undefined;
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [sectionExpanded, setSectionExpanded] = useState<boolean>(false);
  const isTrigger = useSelector((state: RootState) => isTriggerNode(nodeId, state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(nodeId);
  const dependencies = useDependencies(nodeId);

  // Specific for agentic scenarios
  const cognitiveServiceAccountId = useCognitiveServiceAccountId(nodeId, operationInfo?.connectorId);
  const { data: deploymentsForCognitiveServiceAccount, refetch } = useCognitiveServiceAccountDeploymentsForNode(
    nodeId,
    operationInfo?.connectorId
  );
  const { data: foundryAgentsForNode, isLoading: foundryAgentsLoading } = useFoundryAgentsForNode(nodeId);
  const { data: foundryModelsForNode, isLoading: foundryModelsLoading } = useFoundryModelsForNode(nodeId);
  const foundryProjectEndpoint = useFoundryProjectEndpointForNode(nodeId);
  const foundryProjectResourceId = useFoundryProjectResourceIdForNode(nodeId);
  const foundryAccountResourceId = useFoundryAccountResourceIdForNode(nodeId);
  const createFoundryAgent = useCreateFoundryAgent(nodeId);
  const [isCreatingNewAgent, setIsCreatingNewAgent] = useState(false);

  // Track the selected Foundry agent and pending edits (restore from module-level store on remount)
  const existingPendingUpdate = getPendingFoundryUpdate(nodeId);
  // Capture in a ref so the version-init effect can read it without re-triggering on every render.
  const existingPendingUpdateRef = useRef(existingPendingUpdate);
  const [pendingFoundryModel, setPendingFoundryModel] = useState<string | undefined>(existingPendingUpdate?.updates?.model);
  const [pendingFoundryInstructions, setPendingFoundryInstructions] = useState<string | undefined>(
    existingPendingUpdate?.updates?.instructions
  );

  const { variables, upstreamNodeIds, operationDefinition, connectionReference, idReplacements, workflowParameters, nodesMetadata } =
    useSelector((state: RootState) => {
      return {
        upstreamNodeIds: getRecordEntry(state.tokens.outputTokens, nodeId)?.upstreamNodeIds,
        variables: state.tokens.variables,
        operationDefinition: getRecordEntry(state.workflow.newlyAddedOperations, nodeId)
          ? undefined
          : getRecordEntry(state.workflow.operations, nodeId),
        connectionReference: getConnectionReference(state.connections, nodeId),
        idReplacements: state.workflow.idReplacements,
        workflowParameters: state.workflowParameters.definitions,
        nodesMetadata: state.workflow.nodesMetadata,
      };
    });
  const nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;
  const isWithinAgenticLoop = useIsWithinAgenticLoop(nodeGraphId);
  const isA2AWorkflow = useIsA2AWorkflow();
  const rootState = useSelector((state: RootState) => state);
  const displayNameResult = useConnectorName(operationInfo);
  const panelLocation = usePanelLocation();
  const connector = useConnectorByNodeId(nodeId);

  const { suppressCastingForSerialize, enableMultiVariable } = useHostOptions();

  const [tokenMapping, setTokenMapping] = useState<Record<string, ValueSegment>>({});

  const nodeInputs = useMemo(
    () => rootState.operations.inputParameters[nodeId] ?? { parameterGroups: {} },
    [nodeId, rootState.operations.inputParameters]
  );

  const isAgentServiceConnection = useMemo(() => {
    return isAgentConnectorAndAgentServiceModel(operationInfo.connectorId, group.id, nodeInputs.parameterGroups);
  }, [group.id, nodeInputs.parameterGroups, operationInfo.connectorId]);

  // When a Foundry connection becomes active, eagerly assign RBAC roles so the proxy can
  // authenticate via MSI before the workflow is saved.
  const rbacAssignedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isAgentServiceConnection || !foundryAccountResourceId || rbacAssignedRef.current === foundryAccountResourceId) {
      return;
    }
    // Mark as in-progress to prevent concurrent attempts
    const targetResourceId = foundryAccountResourceId;
    rbacAssignedRef.current = targetResourceId;
    getMissingRoleDefinitions(targetResourceId, [
      'Azure AI User',
      'Azure AI Administrator',
      'Azure AI Developer',
      'Cognitive Services Contributor',
    ])
      .then((missingRoles) =>
        Promise.all(missingRoles.map((role) => RoleService().addAppRoleAssignmentForResource(targetResourceId, role.id)))
      )
      .catch(() => {
        // Clear the ref on failure so subsequent renders can retry
        if (rbacAssignedRef.current === targetResourceId) {
          rbacAssignedRef.current = undefined;
        }
      });
  }, [isAgentServiceConnection, foundryAccountResourceId]);

  // Detect if the node already has a foundryAgentId but agentModelType hasn't been populated yet.
  // This avoids flashing the generic agent UI while the connection type is still resolving.
  // Only applies when agentModelType is truly empty (not yet loaded); if it's set to a
  // non-Foundry value (e.g. after switching connections) this must return false.
  const isFoundryAgentPending = useMemo(() => {
    if (isAgentServiceConnection) {
      return false;
    }
    const agentModelType = findFoundryParam(nodeInputs.parameterGroups, group.id, agentModelTypeParameterKey)?.value?.[0]?.value;
    if (agentModelType) {
      return false;
    }
    return !!findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentId')?.value?.[0]?.value;
  }, [isAgentServiceConnection, nodeInputs.parameterGroups, group.id]);

  // Derive the currently selected Foundry agent from parameter values
  const selectedFoundryAgent = useMemo(() => {
    if (!isAgentServiceConnection || !foundryAgentsForNode?.length) {
      return undefined;
    }
    const agentId = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentId')?.value?.[0]?.value;
    if (!agentId) {
      return undefined;
    }
    return foundryAgentsForNode.find((a) => a.id === agentId);
  }, [isAgentServiceConnection, foundryAgentsForNode, nodeInputs.parameterGroups, group.id]);

  // Fetch versions for the selected Foundry agent
  const { data: foundryVersions, isLoading: foundryVersionsLoading } = useFoundryAgentVersions(nodeId, selectedFoundryAgent?.id);
  const [selectedFoundryVersion, setSelectedFoundryVersion] = useState<string | undefined>(existingPendingUpdate?.selectedVersion);

  // Flag set by the agent-switch reset effect to force effectiveFoundryVersion to
  // ignore stale selectedFoundryVersion/storedVersion during the transition render.
  const agentSwitchPendingRef = useRef(false);

  // Derive the effective version: explicit selection > stored param > latest available
  const effectiveFoundryVersion = useMemo(() => {
    if (agentSwitchPendingRef.current) {
      // Agent just switched — ignore stale selections, wait for new versions to load
      if (foundryVersions?.length) {
        return String(foundryVersions[0].version);
      }
      return undefined;
    }
    if (selectedFoundryVersion && foundryVersions?.some((v) => String(v.version) === selectedFoundryVersion)) {
      return selectedFoundryVersion;
    }
    if (foundryVersions?.length) {
      const storedVersion = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentVersionNumber')?.value?.[0]?.value;
      if (storedVersion && foundryVersions.some((v) => String(v.version) === storedVersion)) {
        return storedVersion;
      }
      return String(foundryVersions[0].version);
    }
    return undefined;
  }, [selectedFoundryVersion, foundryVersions, nodeInputs.parameterGroups, group.id]);

  // Persist the derived version into state AND sync to workflow parameters on initial load
  // or after an agent switch (hasInitializedVersion is reset when the agent changes).
  // Skip instructions sync when pending edits exist (restored from module store after panel reopen).
  const hasInitializedVersion = useRef(false);
  useEffect(() => {
    if (!effectiveFoundryVersion || hasInitializedVersion.current) {
      return;
    }
    hasInitializedVersion.current = true;
    // Clear the agent-switch flag now that we've initialized with the correct version
    agentSwitchPendingRef.current = false;

    // Only overwrite selectedFoundryVersion if we don't already have a restored pending version
    if (!existingPendingUpdateRef.current?.selectedVersion) {
      setSelectedFoundryVersion(effectiveFoundryVersion);
    }

    // Write version number to workflow parameter
    const versionParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentVersionNumber');
    if (versionParam) {
      dispatchParamUpdate(dispatch, nodeId, group.id, versionParam, effectiveFoundryVersion);
    }

    // Sync model and instructions from the selected version to local state.
    // Skip only when the user has pending edits from a prior session (panel reopen).
    const hasPendingEdits =
      existingPendingUpdateRef.current?.updates?.model !== undefined ||
      existingPendingUpdateRef.current?.updates?.instructions !== undefined;
    if (!hasPendingEdits) {
      const selectedVersionData = foundryVersions?.find((v) => String(v.version) === effectiveFoundryVersion);
      const model = selectedVersionData?.definition?.model;
      const instructions = selectedVersionData?.definition?.instructions ?? selectedFoundryAgent?.instructions;

      if (model) {
        setPendingFoundryModel(model);
        const deploymentParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.deploymentId');
        if (deploymentParam) {
          dispatchParamUpdate(dispatch, nodeId, group.id, deploymentParam, model);
        }
      }

      if (instructions) {
        setPendingFoundryInstructions(instructions);
        const messagesParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.messages');
        if (messagesParam) {
          const currentValue = convertSegmentsToString(messagesParam.value ?? []);
          const newMessagesJson = buildMessagesWithSystemInstructions(currentValue, instructions);
          dispatchParamUpdate(dispatch, nodeId, group.id, messagesParam, newMessagesJson);
        }
      }
    }
  }, [effectiveFoundryVersion, foundryVersions, selectedFoundryAgent, nodeInputs.parameterGroups, group.id, nodeId, dispatch]);

  // After a save, Foundry creates a new version — auto-select it
  useEffect(() => {
    if (foundryVersions?.length && needsVersionRefresh(nodeId)) {
      // Always consume the flag to prevent leaks (even if version didn't change)
      consumeVersionRefresh(nodeId);

      const latestVersion = String(foundryVersions[0].version);
      const versionParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentVersionNumber');
      const storedVersion = versionParam?.value?.[0]?.value;

      if (latestVersion !== storedVersion) {
        setSelectedFoundryVersion(latestVersion);
        if (versionParam) {
          dispatchParamUpdate(dispatch, nodeId, group.id, versionParam, latestVersion);
        }
      }
    }
  }, [foundryVersions, nodeInputs.parameterGroups, group.id, nodeId, dispatch]);

  // Reset pending overrides when the user switches to a different agent (not on initial load).
  // On remount, selectedFoundryAgent?.id goes undefined → actual ID as React Query resolves;
  // that transition must NOT clear the pending edits we just restored from the module store.
  // Track the raw foundryAgentId parameter value to reliably detect agent switches,
  // since selectedFoundryAgent depends on the React Query agents list loading.
  const rawFoundryAgentId = useMemo(
    () => findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentId')?.value?.[0]?.value as string | undefined,
    [nodeInputs.parameterGroups, group.id]
  );
  const prevRawAgentIdRef = useRef<string | undefined>(rawFoundryAgentId);
  useEffect(() => {
    if (!isAgentServiceConnection) {
      return;
    }
    const prevId = prevRawAgentIdRef.current;
    prevRawAgentIdRef.current = rawFoundryAgentId;

    // Only clear when the agent param truly changes from one ID to another
    if (prevId && rawFoundryAgentId && prevId !== rawFoundryAgentId) {
      setPendingFoundryModel(undefined);
      setPendingFoundryInstructions(undefined);
      setSelectedFoundryVersion(undefined);
      clearPendingFoundryUpdate(nodeId);
      // Allow the version-init effect to run again for the new agent's versions
      hasInitializedVersion.current = false;
      // Signal effectiveFoundryVersion to ignore stale state during the transition
      agentSwitchPendingRef.current = true;

      // Clear the stored version parameter in Redux so effectiveFoundryVersion
      // falls through to the latest version for the new agent.
      const versionParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentVersionNumber');
      if (versionParam) {
        dispatchParamUpdate(dispatch, nodeId, group.id, versionParam, '');
      }
    }
  }, [isAgentServiceConnection, rawFoundryAgentId, nodeId, nodeInputs.parameterGroups, group.id, dispatch]);

  // Sync pending Foundry changes to the update store for save-time flushing
  const handleFoundryModelChange = useCallback(
    (modelId: string) => {
      setPendingFoundryModel(modelId);
      dispatch(setIsWorkflowDirty(true));
      if (foundryProjectEndpoint && selectedFoundryAgent) {
        setPendingFoundryUpdate(nodeId, {
          projectEndpoint: foundryProjectEndpoint,
          agentId: selectedFoundryAgent.id,
          updates: { model: modelId, instructions: pendingFoundryInstructions ?? selectedFoundryAgent.instructions ?? undefined },
          selectedVersion: selectedFoundryVersion,
        });
      }
      // Sync deploymentId parameter so the serialized workflow includes the model
      const deploymentParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.deploymentId');
      if (deploymentParam) {
        dispatchParamUpdate(dispatch, nodeId, group.id, deploymentParam, modelId);
      }
    },
    [
      foundryProjectEndpoint,
      selectedFoundryAgent,
      nodeId,
      pendingFoundryInstructions,
      selectedFoundryVersion,
      nodeInputs.parameterGroups,
      group.id,
      dispatch,
    ]
  );

  const handleFoundryInstructionsChange = useCallback(
    (instructions: string) => {
      setPendingFoundryInstructions(instructions);
      dispatch(setIsWorkflowDirty(true));
      if (foundryProjectEndpoint && selectedFoundryAgent) {
        setPendingFoundryUpdate(nodeId, {
          projectEndpoint: foundryProjectEndpoint,
          agentId: selectedFoundryAgent.id,
          updates: { model: pendingFoundryModel ?? selectedFoundryAgent.model, instructions },
          selectedVersion: selectedFoundryVersion,
        });
      }
      // Sync system instructions to the messages parameter so the workflow definition stays in sync
      const messagesParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.messages');
      if (messagesParam) {
        const currentValue = convertSegmentsToString(messagesParam.value ?? []);
        const newMessagesJson = buildMessagesWithSystemInstructions(currentValue, instructions);
        dispatchParamUpdate(dispatch, nodeId, group.id, messagesParam, newMessagesJson);
      }
    },
    [
      foundryProjectEndpoint,
      selectedFoundryAgent,
      nodeId,
      pendingFoundryModel,
      selectedFoundryVersion,
      nodeInputs.parameterGroups,
      group.id,
      dispatch,
    ]
  );

  // Sync deploymentId and foundryAgentName when the selected Foundry agent changes
  const prevFoundryAgentIdRef = useRef<string | undefined>(selectedFoundryAgent?.id);
  useEffect(() => {
    if (!selectedFoundryAgent || selectedFoundryAgent.id === prevFoundryAgentIdRef.current) {
      prevFoundryAgentIdRef.current = selectedFoundryAgent?.id;
      return;
    }
    prevFoundryAgentIdRef.current = selectedFoundryAgent.id;

    const deploymentParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.deploymentId');
    if (deploymentParam) {
      const modelValue = pendingFoundryModel ?? selectedFoundryAgent.model;
      dispatchParamUpdate(dispatch, nodeId, group.id, deploymentParam, modelValue);
    }

    // Sync foundryAgentName so the serialized workflow always has the correct agent name
    const nameParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentName');
    if (nameParam) {
      dispatchParamUpdate(dispatch, nodeId, group.id, nameParam, selectedFoundryAgent.name ?? selectedFoundryAgent.id);
    }
  }, [selectedFoundryAgent, pendingFoundryModel, nodeInputs.parameterGroups, group.id, nodeId, dispatch]);

  // Handle version selection — update model/instructions to match the selected version
  const handleFoundryVersionChange = useCallback(
    (version: FoundryAgentVersion) => {
      setSelectedFoundryVersion(version.version);
      dispatch(setIsWorkflowDirty(true));

      const model = version.definition?.model;
      const instructions = version.definition?.instructions;

      // Update pending model/instructions to reflect the selected version
      if (model) {
        setPendingFoundryModel(model);
      }
      if (instructions !== undefined) {
        setPendingFoundryInstructions(instructions);
      }

      // Persist version + model/instructions to the module-level store so edits survive panel close/reopen
      if (foundryProjectEndpoint && selectedFoundryAgent) {
        setPendingFoundryUpdate(nodeId, {
          projectEndpoint: foundryProjectEndpoint,
          agentId: selectedFoundryAgent.id,
          updates: {
            model: model ?? pendingFoundryModel ?? selectedFoundryAgent.model,
            instructions: instructions ?? pendingFoundryInstructions ?? selectedFoundryAgent.instructions ?? undefined,
          },
          selectedVersion: version.version,
        });
      }

      // Sync version number to workflow parameter
      const versionParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentVersionNumber');
      if (versionParam) {
        dispatchParamUpdate(dispatch, nodeId, group.id, versionParam, version.version);
      }

      // Sync deploymentId to the version's model
      if (model) {
        const deploymentParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.deploymentId');
        if (deploymentParam) {
          dispatchParamUpdate(dispatch, nodeId, group.id, deploymentParam, model);
        }
      }
    },
    [
      nodeInputs.parameterGroups,
      group.id,
      dispatch,
      nodeId,
      foundryProjectEndpoint,
      selectedFoundryAgent,
      pendingFoundryModel,
      pendingFoundryInstructions,
    ]
  );

  const buildDependentParam = useCallback(
    (parameterId: string, key: string, value?: string) => {
      const parameterGroup = nodeInputs.parameterGroups[group.id];
      const targetParam = parameterGroup?.parameters.find((param) => equals(key, param.parameterKey, true));
      const resolvedValue = value ?? targetParam?.schema?.default;
      if (resolvedValue === undefined || resolvedValue === null) {
        return undefined;
      }

      return {
        definition: targetParam?.schema,
        dependencyType: 'AgentSchema' as const,
        dependentParameters: { [parameterId]: { isValid: true } },
        parameter: {
          key,
          name: targetParam?.parameterName ?? '',
          type: targetParam?.type ?? '',
          value: [createLiteralValueSegment(resolvedValue)],
        },
      };
    },
    [nodeInputs.parameterGroups, group.id]
  );

  const addFoundryDependentUpdates = useCallback(
    (currentDependencies: typeof dependencies, parameterId: string, agentId?: string, agentName?: string | null) => {
      currentDependencies.inputs ??= {};

      const foundryDependentKeys = [
        { key: 'inputs.$.foundryAgentName', default: agentName ?? agentId },
        { key: 'inputs.$.foundryAgentVersion', default: 'v2' },
        { key: 'inputs.$.foundryAgentVersionNumber', default: '' },
      ];

      for (const { key, default: defaultValue } of foundryDependentKeys) {
        const dependency = buildDependentParam(parameterId, key, defaultValue);
        if (dependency) {
          currentDependencies.inputs[key] = dependency;
        }
      }
    },
    [buildDependentParam]
  );

  const handleCreateFoundryAgent = useCallback(
    async (options: CreateFoundryAgentOptions) => {
      const newAgent = await createFoundryAgent.mutateAsync(options);
      const foundryAgentParam = findFoundryParam(nodeInputs.parameterGroups, group.id, 'inputs.$.foundryAgentId');

      if (foundryAgentParam) {
        const updatedDependencies = clone(dependencies);
        addFoundryDependentUpdates(updatedDependencies, foundryAgentParam.id, newAgent.id, newAgent.name);

        dispatch(
          updateParameterAndDependencies({
            nodeId,
            groupId: group.id,
            parameterId: foundryAgentParam.id,
            properties: { value: [createLiteralValueSegment(newAgent.id)] },
            isTrigger,
            operationInfo,
            connectionReference,
            nodeInputs,
            dependencies: updatedDependencies,
            operationDefinition,
          })
        );
      }

      return newAgent;
    },
    [
      createFoundryAgent,
      nodeInputs,
      group.id,
      dependencies,
      addFoundryDependentUpdates,
      dispatch,
      nodeId,
      isTrigger,
      operationInfo,
      connectionReference,
      operationDefinition,
    ]
  );

  const onValueChange = useCallback(
    (id: string, newState: ChangeState, skipStateSave?: boolean) => {
      const { value, viewModel } = newState;
      const parameterGroup = nodeInputs.parameterGroups[group.id];
      const parameter = parameterGroup.parameters.find((param: any) => param.id === id);
      const updatedDependencies = clone(dependencies);

      const propertiesToUpdate: Partial<ParameterInfo> = {
        value,
        preservedValue: undefined,
        ...(viewModel && { editorViewModel: viewModel }),
      };

      // Handle Initialize Variable operation
      if (isInitializeVariableOperation(operationInfo)) {
        const variables = viewModel?.variables as InitializeVariableProps[] | undefined;
        if (variables?.length) {
          dispatch(
            updateVariableInfo({
              id: nodeId,
              variables: variables.map(({ name, type }) => ({
                name: name[0]?.value,
                type: type[0]?.value,
              })),
            })
          );
        }
      }

      // Handle Agent Condition subgraph
      const nodeMetadataInfo = getRecordEntry(nodesMetadata, nodeId);

      if (nodeMetadataInfo?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION && nodeMetadataInfo?.parentNodeId) {
        const agentParameters = (viewModel?.variables ?? []) as InitializeVariableProps[];

        const agentParameterMap: Record<string, AgentParameterDeclaration> = Object.fromEntries(
          agentParameters.map(({ name, type, description }) => [
            name?.[0]?.value,
            {
              name: name?.[0]?.value,
              type: type?.[0]?.value,
              description: convertSegmentsToString(description ?? []),
            },
          ])
        );

        dispatch(
          updateAgentParameter({
            id: nodeId,
            agent: nodeMetadataInfo.parentNodeId,
            agentParameter: agentParameterMap,
          })
        );

        const agentParameterUpdates = agentParameters
          .map(({ name, type, description }) => {
            const paramName = name?.[0]?.value;
            if (!paramName) {
              return null;
            }

            return {
              name: paramName,
              type: type?.[0]?.value ?? '',
              description: convertSegmentsToString(description ?? []),
            };
          })
          .filter(Boolean) as Array<{
          name: string;
          type: string;
          description: string;
        }>;

        dispatch(updateAgentParametersInNode(agentParameterUpdates));
      }

      // Handle custom code parameters
      if (parameter && isCustomCodeParameter(parameter)) {
        const { fileData, fileExtension, fileName } = viewModel.customCodeData;
        dispatch(addOrUpdateCustomCode({ nodeId, fileData, fileExtension, fileName }));
      }

      if (isAgentConnectorAndAgentModel(operationInfo.connectorId ?? '', parameter?.parameterName ?? '')) {
        const newValue = value.length > 0 ? value[0].value : undefined;
        const oldValue = parameter?.value && parameter.value.length > 0 ? parameter.value[0].value : undefined;
        if (!isNullOrUndefined(newValue) && !isNullOrUndefined(oldValue) && newValue !== oldValue && !isNullOrUndefined(connector)) {
          dispatch(
            dynamicallyLoadAgentConnection({
              nodeId,
              connector,
              modelType: newValue,
            })
          );
        }
      }

      const isAgentDeployment = isAgentConnectorAndDeploymentId(operationInfo.connectorId ?? '', parameter?.parameterName ?? '');

      if (isAgentDeployment) {
        const selectedModelId = value?.length ? value[0]?.value : undefined;

        // Look up the deployment from the API response (deployment.name = deploymentId, deployment.properties.model.name = modelId)
        const deploymentInfo = selectedModelId
          ? deploymentsForCognitiveServiceAccount?.find((deployment: any) => deployment.name === selectedModelId)
          : undefined;

        const modelName = deploymentInfo?.properties?.model?.name;
        let modelFormat = deploymentInfo?.properties?.model?.format;
        let modelVersion = deploymentInfo?.properties?.model?.version;

        // For MicrosoftFoundry, format and version are not in the ARM response — fill from AGENT_MODEL_CONFIG
        if (!modelFormat || !modelVersion) {
          const config = modelName ? AGENT_MODEL_CONFIG[modelName] : undefined;
          if (!modelFormat) {
            modelFormat = config?.format ?? 'OpenAI';
          }
          if (!modelVersion) {
            modelVersion = config?.version;
          }
        }

        updatedDependencies.inputs ??= {};

        const agentDeploymentKeys = [
          {
            key: 'inputs.$.agentModelSettings.deploymentModelProperties.name',
            default: modelName,
          },
          {
            key: 'inputs.$.agentModelSettings.deploymentModelProperties.format',
            default: modelFormat,
          },
          {
            key: 'inputs.$.agentModelSettings.deploymentModelProperties.version',
            default: modelVersion,
          },
        ];

        for (const { key, default: defaultValue } of agentDeploymentKeys) {
          const dependency = buildDependentParam(id, key, defaultValue);
          if (dependency) {
            updatedDependencies.inputs[key] = dependency;
          }
        }
      }

      // Auto-populate dependent fields when foundryAgentId changes
      const isFoundryAgentSelection = isAgentConnectorAndFoundryAgentId(operationInfo.connectorId ?? '', parameter?.parameterName ?? '');
      if (isFoundryAgentSelection && foundryAgentsForNode?.length) {
        const selectedAgentId = value?.length ? value[0]?.value : undefined;
        const selectedAgent = selectedAgentId ? foundryAgentsForNode.find((agent) => agent.id === selectedAgentId) : undefined;

        addFoundryDependentUpdates(updatedDependencies, id, selectedAgentId, selectedAgent?.name);
      }

      // Final dispatch to update parameter and dependencies
      dispatch(
        updateParameterAndDependencies({
          nodeId,
          groupId: group.id,
          parameterId: id,
          properties: propertiesToUpdate,
          isTrigger,
          operationInfo,
          connectionReference,
          nodeInputs,
          dependencies: updatedDependencies,
          operationDefinition,
          skipStateSave,
        })
      );
    },
    [
      nodeInputs,
      group.id,
      dependencies,
      operationInfo,
      nodesMetadata,
      nodeId,
      dispatch,
      isTrigger,
      connectionReference,
      operationDefinition,
      connector,
      deploymentsForCognitiveServiceAccount,
      foundryAgentsForNode,
      buildDependentParam,
      addFoundryDependentUpdates,
    ]
  );

  const onComboboxMenuOpen = (parameter: ParameterInfo): void => {
    if (parameter.dynamicData?.status === DynamicLoadStatus.FAILED || parameter.dynamicData?.status === DynamicLoadStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(
        nodeId,
        group.id,
        parameter.id,
        operationInfo,
        connectionReference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    }
  };

  const fileNameChange = useCallback(
    (originalFileName: string, fileName: string): void => {
      dispatch(
        renameCustomCodeFile({
          newFileName: fileName,
          oldFileName: originalFileName,
        })
      );
    },
    [dispatch]
  );

  const getPickerCallbacks = (parameter: ParameterInfo) => ({
    getFileSourceName: (): string => {
      return displayNameResult.result;
    },
    getDisplayValueFromSelectedItem: (selectedItem: any) => getDisplayValueFromPickerSelectedItem(selectedItem, parameter, dependencies),
    getValueFromSelectedItem: (selectedItem: any) => getValueFromPickerSelectedItem(selectedItem, parameter, dependencies),
    onFolderNavigation: (selectedItem: any | undefined): void => {
      loadDynamicTreeItemsForParameter(
        nodeId,
        group.id,
        parameter.id,
        selectedItem,
        operationInfo,
        connectionReference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    },
  });

  const getValueSegmentFromToken = useCallback(
    async (
      parameterId: string,
      token: OutputToken,
      addImplicitForeachIfNeeded: boolean,
      addLatestActionName: boolean
    ): Promise<ValueSegment> => {
      return createValueSegmentFromToken(nodeId, parameterId, token, addImplicitForeachIfNeeded, addLatestActionName, rootState, dispatch);
    },
    [dispatch, nodeId, rootState]
  );

  const showAgentParameterButton = useMemo(() => {
    let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

    while (nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        return undefined;
      }

      const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
      if (isAgentCondition) {
        break;
      }

      nodeGraphId = nodeMetadata.graphId;
    }
    return !!nodeGraphId;
  }, [nodesMetadata, nodeId]);

  const createOrUpdateAgentParameter = (name: string, type: string, description: string, isUpdating?: boolean) => {
    let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

    while (nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        return undefined;
      }

      const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
      if (isAgentCondition) {
        break;
      }

      nodeGraphId = nodeMetadata.graphId;
    }

    if (!nodeGraphId) {
      return undefined;
    }

    const upstreamAgentNodeId = getRecordEntry(nodesMetadata, nodeGraphId)?.parentNodeId;
    if (!upstreamAgentNodeId) {
      return undefined;
    }
    dispatch(
      addAgentParameterToNode({
        conditionId: nodeGraphId,
        agentId: upstreamAgentNodeId,
        agentParameter: { name, type, description },
      })
    );

    const conditionParameter = rootState.operations.inputParameters[nodeGraphId].parameterGroups[
      ParameterGroupKeys.DEFAULT
    ].parameters.find((param: any) => param.parameterName === 'agentParameterSchema');
    if (!conditionParameter?.id) {
      return;
    }
    const previousToolValue = parseSchemaAsVariableEditorSegments(conditionParameter.value) ?? [];
    previousToolValue.push({
      name: [createLiteralValueSegment(name)],
      type: [createLiteralValueSegment(type)],
      description: [createLiteralValueSegment(description)],
      value: [],
    });

    const newToolValue = convertVariableEditorSegmentsAsSchema(previousToolValue);

    dispatch(
      updateNodeParameters({
        nodeId: nodeGraphId,
        parameters: [
          {
            groupId: ParameterGroupKeys.DEFAULT,
            parameterId: conditionParameter.id,
            propertiesToUpdate: {
              value: newToolValue,
              preservedValue: undefined,
            },
          },
        ],
      })
    );

    if (isUpdating) {
      dispatch(updateAgentParametersInNode([{ name, type, description }]));
    }

    return undefined;
  };

  const getTokenPicker = (
    parameter: ParameterInfo,
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    editorType?: string,
    isCodeEditor?: boolean,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    const parameterType = editorType ?? parameter?.type;
    const supportedTypes: string[] = getPropertyValue(constants.TOKENS, getTypeForTokenFiltering(parameterType));

    const filteredTokenGroup = tokenGroup.map((group) => ({
      ...group,
      tokens: group.tokens.filter((token: OutputToken) => {
        if (isCodeEditor) {
          return !(
            token.outputInfo.type === TokenType.VARIABLE ||
            token.outputInfo.type === TokenType.PARAMETER ||
            token.outputInfo.type === TokenType.AGENTPARAMETER ||
            token.outputInfo.arrayDetails ||
            token.key === constants.UNTIL_CURRENT_ITERATION_INDEX_KEY ||
            token.key === constants.FOREACH_CURRENT_ITEM_KEY
          );
        }
        return supportedTypes.some((supportedType) => {
          return !Array.isArray(token.type) && equals(supportedType, token.type);
        });
      }),
    }));

    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={tokenGroup}
        filteredTokenGroup={filteredTokenGroup}
        expressionGroup={expressionGroup}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameter.id, token, addImplicitForeach, !!isCodeEditor)
        }
        valueType={parameterType}
        parameter={parameter}
        tokenClickedCallback={tokenClickedCallback}
        createOrUpdateAgentParameter={createOrUpdateAgentParameter}
      />
    );
  };

  const refetchAndSetDeploymentForCognitiveServiceAccount = useCallback(
    (name?: string) => {
      if (name) {
        refetch();
        // TODO: Set default value for the deployment
      }
    },
    [refetch]
  );

  useEffect(() => {
    const callback = async () => {
      const mapping: Record<string, ValueSegment> = {};
      for (const group of tokenGroup) {
        for (const token of group.tokens) {
          if (!token.value) {
            continue;
          }

          mapping[token.value] = await getValueSegmentFromToken(nodeId, token, false, false);
        }
      }
      setTokenMapping(mapping);
    };

    callback();
  }, [getValueSegmentFromToken, nodeId, tokenGroup]);

  const onExpandSection = (sectionName: string) => {
    if (sectionName) {
      setSectionExpanded(!sectionExpanded);
    }
  };
  const currentAgentModelType = findFoundryParam(nodeInputs.parameterGroups, group.id, agentModelTypeParameterKey)?.value?.[0]?.value as
    | string
    | undefined;

  const settings: Settings[] = group?.parameters
    .filter((x) => !x.hideInUI && shouldUseParameterInGroup(x, group.parameters))
    .map((param) => {
      const {
        id,
        label,
        value,
        required,
        showTokens,
        placeholder,
        editorViewModel,
        dynamicData,
        conditionalVisibility,
        validationErrors,
        parameterKey,
      } = param;

      const remappedEditorViewModel = isRecordNotEmpty(idReplacements)
        ? remapEditorViewModelWithNewIds(editorViewModel, idReplacements)
        : editorViewModel;

      const paramSubset = {
        id,
        label,
        required,
        showTokens,
        placeholder,
        editorViewModel: remappedEditorViewModel,
        conditionalVisibility,
        parameterKey,
      };

      const { editor, editorOptions } = getEditorAndOptions(
        operationInfo,
        param,
        upstreamNodeIds ?? [],
        variables,
        deploymentsForCognitiveServiceAccount ?? [],
        isA2AWorkflow,
        foundryAgentsForNode ?? [],
        currentAgentModelType
      );

      const createNewResourceEditorProps = getCustomEditorForNewResource(
        operationInfo,
        param,
        cognitiveServiceAccountId,
        refetchAndSetDeploymentForCognitiveServiceAccount,
        currentAgentModelType
      );

      const { value: remappedValues } = isRecordNotEmpty(idReplacements) ? remapValueSegmentsWithNewIds(value, idReplacements) : { value };

      const isCodeEditor = editor?.toLowerCase() === constants.EDITOR.CODE;

      const { subMenu, subComponent } = getConnectionElements(param);
      return {
        settingType: 'SettingTokenField',
        settingProp: {
          ...paramSubset,
          readOnly: editorOptions?.readOnly || readOnly,
          value: remappedValues,
          editor,
          editorOptions,
          tokenEditor: true,
          isDynamic: dynamicData !== undefined,
          isLoading: dynamicData?.status === DynamicLoadStatus.LOADING,
          errorDetails: dynamicData?.error ? { message: dynamicData.error.message } : undefined,
          validationErrors,
          tokenMapping,
          loadParameterValueFromString,
          onValueChange: (newState: ChangeState, skipStateSave?: boolean) => onValueChange(id, newState, skipStateSave),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          onFileNameChange: fileNameChange,
          pickerCallbacks: getPickerCallbacks(param),
          tokenpickerButtonProps: {
            location: panelLocation === PanelLocation.Left ? TokenPickerButtonLocation.Right : TokenPickerButtonLocation.Left,
            hideButtonOptions: {
              hideDynamicContent: isAgentServiceConnection,
              hideExpression: isAgentServiceConnection,
            },
          },
          agentParameterButtonProps: { showAgentParameterButton },
          hostOptions: {
            suppressCastingForSerialize,
            isMultiVariableEnabled: enableMultiVariable,
          },
          onCastParameter: (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) =>
            parameterValueToString(
              {
                value,
                type: type ?? 'string',
                info: { format },
                suppressCasting,
              } as ParameterInfo,
              false,
              idReplacements,
              shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo)
            ) ?? '',
          getTokenPicker: (
            editorId: string,
            labelId: string,
            tokenPickerMode?: TokenPickerMode,
            editorType?: string,
            tokenClickedCallback?: (token: ValueSegment) => void
          ) => getTokenPicker(param, editorId, labelId, tokenPickerMode, editorType, isCodeEditor, tokenClickedCallback),
          subComponent: subComponent,
          subMenu: subMenu,
          newResourceProps: createNewResourceEditorProps,
          hideTokenPicker: !isWithinAgenticLoop /* only used in python code editor */,
        },
      };
    });

  // Hide AI model & collapse system instructions when Foundry manages them
  const filterFoundryManagedSettings = (items: typeof settings) =>
    items
      .filter((s) => !(s.settingType === 'SettingTokenField' && (s.settingProp as any)?.parameterKey === FOUNDRY_DEPLOYMENT_KEY))
      .map((s) => {
        if (s.settingType === 'SettingTokenField' && (s.settingProp as any)?.parameterKey === FOUNDRY_MESSAGES_KEY) {
          return {
            ...s,
            settingProp: {
              ...s.settingProp,
              editorOptions: { ...(s.settingProp as any).editorOptions, hideSystemInstructions: true, hideLabel: true },
            },
          };
        }
        return s;
      });

  const createAgentInline = (
    <CreateFoundryAgentInline
      models={foundryModelsForNode ?? []}
      modelsLoading={foundryModelsLoading}
      onCreateAgent={handleCreateFoundryAgent}
      isCreating={createFoundryAgent.isLoading}
      disabled={readOnly}
      showForm={isCreatingNewAgent}
      onShowFormChange={setIsCreatingNewAgent}
    />
  );

  // Show a loading indicator while Foundry agent data is resolving.
  // This prevents the generic agent parameters from flashing before the Foundry-specific UI loads.
  if (isAgentServiceConnection && rawFoundryAgentId && !selectedFoundryAgent && foundryAgentsLoading) {
    const agentPickerSetting = settings.find(
      (s) => s.settingType === 'SettingTokenField' && (s.settingProp as any)?.parameterKey === FOUNDRY_AGENT_KEY
    );

    return (
      <>
        {agentPickerSetting && (
          <SettingsSection
            id={group.id}
            nodeId={nodeId}
            sectionName={group.description}
            title={group.description}
            settings={[agentPickerSetting]}
            showHeading={!!group.description}
            expanded={sectionExpanded}
            onHeaderClick={onExpandSection}
            showSeparator={false}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spinner size="tiny" label="Loading agent details..." />
        </div>
      </>
    );
  }

  // Insert FoundryAgentDetails inline after the Agent picker when a Foundry agent is selected
  if (isAgentServiceConnection && selectedFoundryAgent) {
    const foundryAgentSettingIndex = settings.findIndex(
      (s) => s.settingType === 'SettingTokenField' && (s.settingProp as any)?.parameterKey === FOUNDRY_AGENT_KEY
    );

    if (foundryAgentSettingIndex >= 0) {
      // Extract the agent picker setting and filter Foundry-managed fields from all other settings
      const agentPickerSetting = settings[foundryAgentSettingIndex];
      const remainingSettings = filterFoundryManagedSettings([
        ...settings.slice(0, foundryAgentSettingIndex),
        ...settings.slice(foundryAgentSettingIndex + 1),
      ]);

      return (
        <>
          <div style={isCreatingNewAgent ? { opacity: 0.5 } : undefined} {...(isCreatingNewAgent ? { inert: '' } : {})}>
            <SettingsSection
              id={group.id}
              nodeId={nodeId}
              sectionName={group.description}
              title={group.description}
              settings={[agentPickerSetting]}
              showHeading={!!group.description}
              expanded={sectionExpanded}
              onHeaderClick={onExpandSection}
              showSeparator={false}
            />
          </div>
          {isCreatingNewAgent ? (
            createAgentInline
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FoundryPortalLink
                  projectResourceId={foundryProjectResourceId}
                  agentId={selectedFoundryAgent.id}
                  versionNumber={effectiveFoundryVersion}
                />
                {createAgentInline}
              </div>
              <FoundryAgentDetails
                agent={selectedFoundryAgent}
                models={foundryModelsForNode ?? []}
                modelsLoading={foundryModelsLoading}
                selectedModel={pendingFoundryModel}
                selectedInstructions={pendingFoundryInstructions}
                onModelChange={handleFoundryModelChange}
                onInstructionsChange={handleFoundryInstructionsChange}
                versions={foundryVersions}
                versionsLoading={foundryVersionsLoading}
                selectedVersion={effectiveFoundryVersion}
                onVersionChange={handleFoundryVersionChange}
              />
            </>
          )}
          {remainingSettings.length > 0 && (
            <SettingsSection
              id={`${group.id}-after-foundry`}
              nodeId={nodeId}
              settings={remainingSettings}
              showHeading={false}
              showSeparator={false}
            />
          )}
        </>
      );
    }
  }

  // When Foundry connection is active but no agent selected yet, hide system instructions
  // and deploymentId since they'll be managed via FoundryAgentDetails once an agent is picked.
  // Also move the Agent picker to the top for consistent ordering.
  // Also applies when the connection type is still resolving (isFoundryAgentPending) to prevent
  // the generic agent UI from flashing before the Foundry-specific UI loads.
  if (isAgentServiceConnection || isFoundryAgentPending) {
    const filtered = filterFoundryManagedSettings(settings);
    const agentIdx = filtered.findIndex(
      (s) => s.settingType === 'SettingTokenField' && (s.settingProp as any)?.parameterKey === FOUNDRY_AGENT_KEY
    );

    // Split: agent picker goes first, then create button, then remaining settings
    if (agentIdx >= 0) {
      const agentPickerSetting = filtered[agentIdx];
      const otherSettings = [...filtered.slice(0, agentIdx), ...filtered.slice(agentIdx + 1)];

      return (
        <>
          <SettingsSection
            id={group.id}
            nodeId={nodeId}
            sectionName={group.description}
            title={group.description}
            settings={[agentPickerSetting]}
            showHeading={!!group.description}
            expanded={sectionExpanded}
            onHeaderClick={onExpandSection}
            showSeparator={false}
          />
          {createAgentInline}
          {otherSettings.length > 0 && (
            <SettingsSection
              id={`${group.id}-after-foundry`}
              nodeId={nodeId}
              settings={otherSettings}
              showHeading={false}
              showSeparator={false}
            />
          )}
        </>
      );
    }

    // Fallback: no agent picker found, render all with create at end
    return (
      <>
        <SettingsSection
          id={group.id}
          nodeId={nodeId}
          sectionName={group.description}
          title={group.description}
          settings={filtered}
          showHeading={!!group.description}
          expanded={sectionExpanded}
          onHeaderClick={onExpandSection}
          showSeparator={false}
        />
        {createAgentInline}
      </>
    );
  }

  return (
    <SettingsSection
      id={group.id}
      nodeId={nodeId}
      sectionName={group.description}
      title={group.description}
      settings={settings}
      showHeading={!!group.description}
      expanded={sectionExpanded}
      onHeaderClick={onExpandSection}
      showSeparator={false}
    />
  );
};

const getConnectionElements = (parameter: ParameterInfo) => {
  const hasConnectionInline = getPropertyValue(parameter.schema, ExtensionProperties.InlineConnection);

  if (hasConnectionInline) {
    const connectionOptions = getPropertyValue(parameter.schema, ExtensionProperties.InlineConnectionOptions);
    const visibility = getPropertyValue(connectionOptions ?? {}, ExtensionProperties.Visibility);
    const subLabelOnly = equals(visibility ?? '', 'subLabelOnly', true);

    return {
      subComponent: <ConnectionInline subLabelOnly={subLabelOnly} />,
      subMenu: subLabelOnly ? null : <ConnectionsSubMenu />,
    };
  }

  return {
    subComponent: null,
    subMenu: null,
  };
};

export const getCustomEditorForNewResource = (
  operationInfo: OperationInfo,
  parameter: ParameterInfo,
  cognitiveServiceAccountId: string | undefined,
  refetchDeploymentModels: (name?: string) => void,
  agentModelType?: string
): NewResourceProps | undefined => {
  const hasInlineCreateResource = getPropertyValue(parameter.schema, ExtensionProperties.InlineCreateNewResource);

  // Adding agent check spefically since create new is specific to agentic for now, will generalize and remove it later
  if (hasInlineCreateResource) {
    const customEditor = EditorService()?.getNewResourceEditor({
      operationInfo,
      parameter,
    });

    // Create new resource editor is only available when Connection is enabled
    if (customEditor && cognitiveServiceAccountId) {
      return {
        component: customEditor.EditorComponent,
        hideLabel: customEditor.hideLabel,
        editor: customEditor.editor,
        onClose: refetchDeploymentModels,
        metadata: { cognitiveServiceAccountId: cognitiveServiceAccountId, agentModelType },
      };
    }
  }

  return undefined;
};

export const getEditorAndOptions = (
  operationInfo: OperationInfo,
  parameter: ParameterInfo,
  upstreamNodeIds: string[],
  variables: Record<string, VariableDeclaration[]>,
  deploymentsForCognitiveServiceAccount: any[] = [],
  isA2AWorkflow?: boolean,
  foundryAgents: any[] = [],
  agentModelType?: string
): { editor?: string; editorOptions?: any } => {
  const customEditor = EditorService()?.getEditor({
    operationInfo,
    parameter,
  });
  if (customEditor) {
    return toCustomEditorAndOptions(customEditor);
  }

  const { editor, editorOptions } = parameter;
  const supportedTypes: string[] = editorOptions?.supportedTypes ?? [];

  // Handle variable dropdown editor
  if (equals(editor, constants.EDITOR.VARIABLE_NAME)) {
    const options = getAvailableVariables(variables, upstreamNodeIds)
      .filter((variable) => supportedTypes.length === 0 || supportedTypes.includes(variable.type))
      .map((variable) => ({
        value: variable.name,
        displayName: variable.name,
      }));

    return {
      editor: 'dropdown',
      editorOptions: { options },
    };
  }

  // Handle agent connector with supported deployments
  const isAgent = isAgentConnectorAndDeploymentId(operationInfo?.connectorId, parameter.parameterName);
  if (equals(editor, 'combobox') && isAgent) {
    const supportedModels =
      agentModelType === 'MicrosoftFoundry' ? constants.SUPPORTED_FOUNDRY_AGENT_MODELS : constants.SUPPORTED_AGENT_OPENAI_MODELS;
    const options = deploymentsForCognitiveServiceAccount
      .filter((deployment) => {
        const modelName = (deployment.properties?.model?.name ?? '').toLowerCase();
        return supportedModels.includes(modelName);
      })
      .map((deployment) => ({
        value: deployment.name,
        displayName: `${deployment.name}${deployment.properties?.model?.name ? ` (${deployment.properties.model.name})` : ''}`,
      }));

    return {
      editor,
      editorOptions: { options },
    };
  }

  // Handle Foundry agent picker combobox
  const isFoundryAgent = isAgentConnectorAndFoundryAgentId(operationInfo?.connectorId, parameter.parameterName);
  if (equals(editor, 'combobox') && isFoundryAgent) {
    const options = foundryAgents.map((agent: any) => ({
      value: agent.id,
      displayName: `${agent.name ?? agent.id}${agent.model ? ` (${agent.model})` : ''}`,
    }));

    return {
      editor,
      editorOptions: { options },
    };
  }

  // Hide user instruction editor for A2A workflows
  if (equals(editor, constants.EDITOR.AGENT_INSTRUCTION) && isA2AWorkflow) {
    return {
      editor,
      editorOptions: {
        ...editorOptions,
        hideUserInstructions: true,
      },
    };
  }

  return { editor, editorOptions };
};

const hasParametersToAuthor = (parameterGroups: Record<string, ParameterGroup>): boolean => {
  return Object.keys(parameterGroups).some((key) => parameterGroups[key].parameters.filter((p) => !p.hideInUI).length > 0);
};

// --- Foundry parameter helpers ---

/** Find a parameter in a group by its parameterKey. */
function findFoundryParam(parameterGroups: Record<string, ParameterGroup>, groupId: string, key: string): ParameterInfo | undefined {
  return parameterGroups[groupId]?.parameters?.find((p: ParameterInfo) => p.parameterKey === key);
}

/** Dispatch a single parameter value update to the Redux store. */
function dispatchParamUpdate(dispatch: AppDispatch, nodeId: string, groupId: string, param: ParameterInfo, value: string): void {
  dispatch(
    updateNodeParameters({
      nodeId,
      parameters: [
        {
          groupId,
          parameterId: param.id,
          propertiesToUpdate: { value: [createLiteralValueSegment(String(value))], preservedValue: undefined },
        },
      ],
    })
  );
}

/**
 * Build a messages JSON array with updated system instructions, preserving user messages.
 */
function buildMessagesWithSystemInstructions(currentMessagesValue: string, systemInstructions: string): string {
  let userMessages: { role: string; content: string }[] = [];
  try {
    const parsed = JSON.parse(currentMessagesValue || '[]');
    if (Array.isArray(parsed)) {
      userMessages = parsed.filter((m: { role: string }) => m.role === 'user');
    }
  } catch {
    // preserve nothing on parse failure
  }
  return JSON.stringify([{ role: 'system', content: systemInstructions }, ...userMessages], null, 4);
}

interface CreateFoundryAgentInlineProps {
  models: Array<{ id: string; name: string }>;
  modelsLoading: boolean;
  onCreateAgent: (options: CreateFoundryAgentOptions) => Promise<unknown>;
  isCreating: boolean;
  disabled?: boolean;
  /** Controlled form visibility — lifted to parent so it can toggle other sections. */
  showForm: boolean;
  onShowFormChange: (show: boolean) => void;
}

function CreateFoundryAgentInline({
  models,
  modelsLoading,
  onCreateAgent,
  isCreating,
  disabled,
  showForm,
  onShowFormChange,
}: CreateFoundryAgentInlineProps) {
  const intl = useIntl();
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string>();

  const createNewLabel = intl.formatMessage({
    defaultMessage: 'Create new agent',
    id: 'p4xMOj',
    description: 'Button text for opening the inline Foundry agent creation form',
  });
  const agentNameLabel = intl.formatMessage({
    defaultMessage: 'Agent name',
    id: '613mcC',
    description: 'Label for the Foundry agent name input',
  });
  const agentNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter agent name',
    id: 'fYtcZk',
    description: 'Placeholder for the Foundry agent name input',
  });
  const modelLabel = intl.formatMessage({
    defaultMessage: 'Model',
    id: 'TC0zK+',
    description: 'Label for the Foundry agent model picker',
  });
  const modelPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a model',
    id: 'Y+MQKB',
    description: 'Placeholder for the Foundry agent model picker',
  });
  const loadingModelsLabel = intl.formatMessage({
    defaultMessage: 'Loading models...',
    id: 'atEeTB',
    description: 'Placeholder shown while Foundry models are loading',
  });
  const instructionsLabel = intl.formatMessage({
    defaultMessage: 'Instructions',
    id: 't306o+',
    description: 'Label for the Foundry agent instructions input',
  });
  const instructionsPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter agent instructions',
    id: 'RSU2+t',
    description: 'Placeholder for the Foundry agent instructions input',
  });
  const createLabel = intl.formatMessage({
    defaultMessage: 'Create',
    id: 'uzC6bF',
    description: 'Button text for creating a Foundry agent',
  });
  const creatingLabel = intl.formatMessage({
    defaultMessage: 'Creating...',
    id: 'sYIWaR',
    description: 'Button text shown while a Foundry agent is being created',
  });
  const cancelLabel = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'focYsW',
    description: 'Button text for canceling inline Foundry agent creation',
  });
  const createErrorLabel = intl.formatMessage({
    defaultMessage: 'Failed to create agent',
    id: '9CPgcj',
    description: 'Fallback error message shown when Foundry agent creation fails',
  });

  const resetForm = useCallback(() => {
    onShowFormChange(false);
    setName('');
    setModel('');
    setInstructions('');
    setError(undefined);
  }, [onShowFormChange]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedInstructions = instructions.trim();
    if (!trimmedName || !model) {
      return;
    }

    setError(undefined);
    try {
      await onCreateAgent({
        name: trimmedName,
        model,
        ...(trimmedInstructions && { instructions: trimmedInstructions }),
      });
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : createErrorLabel);
    }
  }, [createErrorLabel, instructions, model, name, onCreateAgent, resetForm]);

  if (!showForm) {
    return (
      <Button
        appearance="transparent"
        size="small"
        onClick={() => onShowFormChange(true)}
        disabled={disabled}
        style={{ justifyContent: 'flex-start', paddingLeft: 0, color: 'var(--colorBrandForeground1)' }}
      >
        + {createNewLabel}
      </Button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        marginTop: '4px',
        backgroundColor: 'var(--colorNeutralBackground2)',
        borderRadius: '4px',
        border: '1px solid var(--colorBrandStroke1)',
      }}
    >
      <Text weight="semibold" size={300}>
        {createNewLabel}
      </Text>
      <Field label={agentNameLabel} required>
        <Input
          value={name}
          onChange={(_, data) => setName(data.value)}
          placeholder={agentNamePlaceholder}
          size="small"
          disabled={isCreating}
        />
      </Field>
      <Field label={modelLabel} required>
        <Dropdown
          value={models.find((entry) => entry.id === model)?.name ?? ''}
          selectedOptions={model ? [model] : []}
          onOptionSelect={(_, data) => setModel(data.optionValue ?? '')}
          placeholder={modelsLoading ? loadingModelsLabel : modelPlaceholder}
          disabled={isCreating || modelsLoading}
        >
          {models.map((entry) => (
            <Option key={entry.id} value={entry.id} text={entry.name}>
              {entry.name}
            </Option>
          ))}
        </Dropdown>
      </Field>
      <Field label={instructionsLabel}>
        <Textarea
          value={instructions}
          onChange={(_, data) => setInstructions(data.value)}
          placeholder={instructionsPlaceholder}
          resize="vertical"
          disabled={isCreating}
        />
      </Field>
      {error ? (
        <Text size={200} style={{ color: 'var(--colorPaletteRedForeground1)' }}>
          {error}
        </Text>
      ) : null}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button appearance="primary" size="small" onClick={handleSubmit} disabled={!name.trim() || !model || isCreating}>
          {isCreating ? creatingLabel : createLabel}
        </Button>
        {isCreating ? <Spinner size="tiny" /> : null}
        <Button appearance="outline" size="small" onClick={resetForm} disabled={isCreating}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}

interface FoundryPortalLinkProps {
  projectResourceId?: string;
  agentId: string;
  versionNumber?: string;
}

function FoundryPortalLink({ projectResourceId, agentId, versionNumber }: FoundryPortalLinkProps) {
  const styles = useFoundryAgentDetailsStyles();
  const intl = useIntl();
  const portalUrl = useMemo(
    () => buildFoundryPortalUrl(projectResourceId, agentId, versionNumber),
    [projectResourceId, agentId, versionNumber]
  );
  const editInPortal = intl.formatMessage({
    defaultMessage: 'Edit in foundry portal',
    id: '1r967W',
    description: 'Link to edit agent in Foundry Portal',
  });

  if (!portalUrl) {
    return null;
  }

  return (
    <Link className={styles.portalLink} href={portalUrl} target="_blank" rel="noopener noreferrer">
      <NavigateIcon />
      {editInPortal}
    </Link>
  );
}

export const parametersTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.PARAMETERS,
  title: props.isAgenticConditionPanel
    ? intl.formatMessage({
        defaultMessage: 'Details',
        id: 'RXj9tF',
        description: 'Details tab title',
      })
    : intl.formatMessage({
        defaultMessage: 'Parameters',
        id: 'uxKRO/',
        description: 'Parameters tab title',
      }),
  description: props.isAgenticConditionPanel
    ? intl.formatMessage({
        defaultMessage: 'Configure details for this node',
        id: 'or0uUQ',
        description: 'Details tab description',
      })
    : intl.formatMessage({
        defaultMessage: 'Configure parameters for this node',
        id: 'SToblZ',
        description: 'Parameters tab description',
      }),
  visible: true,
  content: <ParametersTab {...props} />,
  order: 0,
  icon: 'Info',
});
