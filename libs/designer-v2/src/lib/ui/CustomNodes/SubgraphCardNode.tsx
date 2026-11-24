import constants from '../../common/constants';
import { useOperationInfo, type AppDispatch } from '../../core';
import { initializeSubgraphFromManifest } from '../../core/actions/bjsworkflow/add';
import { getOperationManifest } from '../../core/queries/operation';
import { useMonitoringView, useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { useIconUri, useOperationErrorInfo, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodeSelectedInOperationPanel, useIsNodePinnedToOperationPanel } from '../../core/state/panel/panelSelectors';
import { addAgentToolMetadata, changePanelNode, expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import {
  useActionMetadata,
  useBranchValidationCount,
  useFlowErrorsForNode,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewAdditiveSubgraphId,
  useNodeDisplayName,
  useNodeMetadata,
  useParentNodeId,
  useReplacedIds,
  useRunData,
  useRunIndex,
  useRunInstance,
  useWorkflowNode,
  useNodesMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { addSwitchCase, replaceId, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { fetchBuiltInToolRunData } from '../../core/actions/bjsworkflow/monitoring';
import { getAgentRepetitionIdentity, getScopeRepetitionName } from '../common/LoopsPager/helper';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { SharedLoopsPager } from '../common/LoopsPager/SharedLoopsPager';
import { DropZone } from '../connections/dropzone';
import { horizontalTerminalStyle } from '../connections/connections.styles';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  type DialogOpenChangeData,
  type DialogOpenChangeEvent,
  type InputOnChangeData,
  type InputProps,
} from '@fluentui/react-components';
import {
  WORKFLOW_NODE_TYPES,
  isBuiltInAgentTool,
  SUBGRAPH_TYPES,
  guid,
  isNullOrUndefined,
  removeIdTag,
  useNodeIndex,
} from '@microsoft/logic-apps-shared';
import { memo, useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { SubgraphCard } from './components/card/subgraphCard';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { ErrorLevel } from '../../core/state/operation/operationMetadataSlice';
import { useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { getNodePresentation, isOperationNameValid, type NodePresentation } from '../../core/utils/graph';
import { SharedBranchCard } from './components/card/SharedFamilyCards';
import { useOperationNodeIcon } from './components/card/useOperationNodeIcon';
import { NodeAddButton } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';

const SubgraphCardNode = ({ id, data }: NodeProps) => {
  const subgraphId = removeIdTag(id);
  const node = useActionMetadata(subgraphId);

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelectedInOperationPanel(subgraphId);
  const isPinned = useIsNodePinnedToOperationPanel(subgraphId);
  const isLeaf = useIsLeafNode(id);
  const metadata = useNodeMetadata(subgraphId);
  const sharedOption = useSharedNodeUi();
  const presentation =
    (data?.presentation as NodePresentation | undefined) ??
    getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, sharedOption, {
      operationType: node?.type,
      subgraphType: metadata?.subgraphType,
    });
  const shared = presentation.shared;
  const sharedTool = shared && presentation.family === 'tool';
  const descendantErrorCount = useBranchValidationCount(shared && presentation.family === 'branch' ? subgraphId : undefined);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const operationInfo = useOperationInfo(graphId);
  const nodesMetadata = useNodesMetadata();
  const idReplacements = useReplacedIds();
  const isMonitoringView = useMonitoringView();
  const normalizedType = node?.type.toLowerCase();
  const parentNodeId = useParentNodeId(subgraphId);
  const runData = useRunData(parentNodeId ?? subgraphId);
  const parentActionMetadata = useActionMetadata(parentNodeId);
  const isParentAgent = parentActionMetadata?.type?.toLowerCase() === constants.NODE.TYPE.AGENT;

  const title = useNodeDisplayName(subgraphId);
  const runInstance = useRunInstance();
  const isA2AWorkflow = useIsA2AWorkflow();
  const agentRunIndex = useRunIndex(graphId);
  const ownerParentNodeId = useParentNodeId(graphId);
  const ownerParentRunData = useRunData(ownerParentNodeId ?? '');
  const scopeRepetitionName = useMemo(() => getScopeRepetitionName(agentRunIndex), [agentRunIndex]);
  const agentRepetitionIdentity = useMemo(
    () =>
      getAgentRepetitionIdentity({
        runId: runInstance?.id,
        ownerNodeId: graphId,
        repetitionName: scopeRepetitionName,
        repetitionIndex: agentRunIndex,
        parentStatus: ownerParentRunData?.status,
      }),
    [runInstance?.id, graphId, scopeRepetitionName, agentRunIndex, ownerParentRunData?.status]
  );
  const useScopedToolMonitoringData = shared && sharedTool && isMonitoringView && !isA2AWorkflow && !!agentRepetitionIdentity;
  const hasCurrentToolMonitoringData = !useScopedToolMonitoringData || metadata?.agentRepetitionIdentity === agentRepetitionIdentity;
  const pendingTool = nodesMetadata[graphId]?.pendingBuiltInTool;
  const hasPendingToolSelection =
    useScopedToolMonitoringData &&
    pendingTool?.toolNodeId === subgraphId &&
    pendingTool.invocation.agentRepetitionIdentity === agentRepetitionIdentity;
  const effectiveToolRunData =
    useScopedToolMonitoringData && !hasCurrentToolMonitoringData ? undefined : (metadata?.toolRunData ?? metadata?.runData);

  const isSwitchAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
  const isAgentAddTool = metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON;

  const isAddCase = isSwitchAddCase || isAgentAddTool;
  // Shared tool rows render the collapsed count in their text; fixed-height (36px) branch headers have no
  // second text line, so the host keeps their count below the header.
  const sharedOwnsCount = sharedTool;
  const actionCount = metadata?.actionCount ?? 0;
  const iconUri = useIconUri(graphId);
  const [isRenameCaseDialogOpen, setIsRenameCaseDialogOpen] = useState(false);
  const [renameCaseDraft, setRenameCaseDraft] = useState('');
  const [renameCaseError, setRenameCaseError] = useState<string | undefined>(undefined);

  const intlText = useMemo(
    () => ({
      tool: intl.formatMessage({
        defaultMessage: 'Tool',
        id: '3PXVj+',
        description: 'Label for the tool node',
      }),
      case: intl.formatMessage({
        defaultMessage: 'Case',
        id: 'GusLAj',
        description: 'Label for the case node',
      }),
      addTool: intl.formatMessage({ defaultMessage: 'Add tool', id: 'xX0Xvc', description: 'add a tool to agentic loop' }),
      addCase: intl.formatMessage({ defaultMessage: 'Add case', id: 'TcU2Gf', description: 'add a case to switch statement' }),
      collapsedText: intl.formatMessage(
        {
          defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
          id: 'B/JzwK',
          description: 'This is the number of actions to be completed in a group',
        },
        { actionCount }
      ),
      noActions: intl.formatMessage({
        defaultMessage: 'No actions',
        id: 'CN+Jfd',
        description: 'Text to explain that there are no actions',
      }),
      opManifestErrorText: intl.formatMessage({
        defaultMessage: 'Error fetching manifest',
        id: 'HmcHoE',
        description: 'Error message when manifest fails to load',
      }),
      settingValidationErrorText: intl.formatMessage({
        defaultMessage: 'Invalid settings',
        id: 'Jil/Wa',
        description: 'Text to explain that there are invalid settings for this node',
      }),
      parameterValidationErrorText: intl.formatMessage({
        defaultMessage: 'Invalid parameters',
        id: 'Tmr/9e',
        description: 'Text to explain that there are invalid parameters for this node',
      }),
      flowErrorText: intl.formatMessage({
        defaultMessage: 'Action unreachable',
        id: 'PoPO/T',
        description: 'Text to explain that there are flow structure errors for this node',
      }),
      renameCaseTitle: intl.formatMessage({
        defaultMessage: 'Rename case',
        id: 'MBA7Al',
        description: 'Dialog title shown when renaming a switch-case lane',
      }),
      renameCaseInputLabel: intl.formatMessage({
        defaultMessage: 'Case name',
        id: 'j6+gS9',
        description: 'Input label for renaming a switch-case key',
      }),
      renameCaseSave: intl.formatMessage({
        defaultMessage: 'Save',
        id: 'mBHY52',
        description: 'Button text to confirm renaming a switch-case key',
      }),
      renameCaseCancel: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: 'hu8PnM',
        description: 'Button text to dismiss switch-case rename dialog',
      }),
      renameCaseValidationError: intl.formatMessage({
        defaultMessage: 'Enter a unique case name.',
        id: '1MO/b/',
        description: 'Validation message when a switch-case key rename is invalid',
      }),
    }),
    [actionCount, intl]
  );

  const newAdditiveSubgraphId = useNewAdditiveSubgraphId(isAgentAddTool ? intlText.tool : intlText.case);
  const subgraphClick = useCallback(
    async (_id: string) => {
      if (isAddCase && graphNode) {
        if (isAgentAddTool) {
          const relationshipIds = {
            graphId,
            subgraphId: newAdditiveSubgraphId,
            parentId: `${newAdditiveSubgraphId}-#subgraph`,
          };
          dispatch(expandDiscoveryPanel({ nodeId: guid(), relationshipIds, isAgentTool: true }));
        } else {
          dispatch(addSwitchCase({ caseId: newAdditiveSubgraphId, graphId }));
        }

        const rootManifest = await getOperationManifest(operationInfo);
        if (!rootManifest?.properties?.subGraphDetails) {
          return;
        }
        const caseManifestData = Object.values(rootManifest.properties.subGraphDetails).find((data) => data.isAdditive);
        const subGraphManifest = {
          properties: { ...caseManifestData, iconUri: iconUri ?? '', brandColor: '' },
        };
        if (isAgentAddTool) {
          dispatch(addAgentToolMetadata({ newAdditiveSubgraphId, subGraphManifest }));
        } else {
          initializeSubgraphFromManifest(newAdditiveSubgraphId, subGraphManifest, dispatch);
          dispatch(changePanelNode(newAdditiveSubgraphId));
        }
        dispatch(setFocusNode(newAdditiveSubgraphId));
      } else {
        dispatch(changePanelNode(_id));
        // Opening the card must not replace a chat-selected invocation with the fallback page while its summary loads.
        if (
          isMonitoringView &&
          isBuiltInAgentTool(_id) &&
          !hasPendingToolSelection &&
          (!hasCurrentToolMonitoringData || !metadata?.runData?.inputs) &&
          runInstance?.id &&
          graphId
        ) {
          dispatch(
            fetchBuiltInToolRunData({
              toolNodeId: _id,
              agentNodeId: graphId,
              runId: runInstance.id,
              repetitionName: scopeRepetitionName,
              ...(useScopedToolMonitoringData &&
                agentRepetitionIdentity && {
                  agentToolInvocation: { agentRepetitionIdentity, page: hasCurrentToolMonitoringData ? (metadata?.runIndex ?? 0) : 0 },
                }),
            })
          );
        }
      }
    },
    [
      isAddCase,
      graphNode,
      isAgentAddTool,
      operationInfo,
      iconUri,
      dispatch,
      newAdditiveSubgraphId,
      graphId,
      isMonitoringView,
      metadata,
      runInstance,
      scopeRepetitionName,
      agentRepetitionIdentity,
      hasCurrentToolMonitoringData,
      hasPendingToolSelection,
      useScopedToolMonitoringData,
    ]
  );

  const graphCollapsed = useIsGraphCollapsed(subgraphId);
  const handleGraphCollapse = useCallback(
    (includeNested?: boolean) => {
      dispatch(toggleCollapsedGraphId({ id: subgraphId, includeNested }));
    },
    [dispatch, subgraphId]
  );

  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isAddCase;

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(id));
  }, [dispatch, id]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: subgraphId,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, subgraphId]
  );

  const openContextMenuAtElement = useCallback(
    (anchor: HTMLElement) => {
      const bounds = anchor.getBoundingClientRect();
      dispatch(
        setNodeContextMenuData({
          nodeId: subgraphId,
          entryPoint: 'shared-lane-more',
          location: {
            x: Math.round(bounds.left + bounds.width / 2),
            y: Math.round(bounds.bottom),
          },
        })
      );
    },
    [dispatch, subgraphId]
  );

  const closeRenameCaseDialog = useCallback(() => {
    setIsRenameCaseDialogOpen(false);
    setRenameCaseError(undefined);
  }, []);

  const submitRenameCase = useCallback(() => {
    if (readOnly || isMonitoringView || metadata?.subgraphType !== SUBGRAPH_TYPES.SWITCH_CASE) {
      return;
    }
    // Rename only the switch-case node identifier; the runtime match expression and branch children remain untouched.
    const validation = isOperationNameValid(subgraphId, renameCaseDraft.trim(), false, nodesMetadata, idReplacements, intl);
    if (!validation.isValid) {
      setRenameCaseError(validation.message || intlText.renameCaseValidationError);
      return;
    }
    dispatch(replaceId({ originalId: subgraphId, newId: renameCaseDraft.trim() }));
    closeRenameCaseDialog();
  }, [
    readOnly,
    isMonitoringView,
    metadata?.subgraphType,
    subgraphId,
    renameCaseDraft,
    nodesMetadata,
    idReplacements,
    intl,
    intlText.renameCaseValidationError,
    dispatch,
    closeRenameCaseDialog,
  ]);

  const renameCase = useCallback(() => {
    if (readOnly || isMonitoringView || metadata?.subgraphType !== SUBGRAPH_TYPES.SWITCH_CASE) {
      return;
    }
    setRenameCaseDraft(subgraphId);
    setRenameCaseError(undefined);
    setIsRenameCaseDialogOpen(true);
  }, [readOnly, isMonitoringView, metadata?.subgraphType, subgraphId]);

  const onRenameCaseOpenChange = useCallback(
    (_event: DialogOpenChangeEvent, data: DialogOpenChangeData) => {
      if (!data.open) {
        closeRenameCaseDialog();
      }
    },
    [closeRenameCaseDialog]
  );

  const onRenameCaseDraftChange = useCallback((_event: unknown, data: InputOnChangeData) => {
    setRenameCaseDraft(data.value);
    setRenameCaseError(undefined);
  }, []);

  const onRenameCaseDraftKeyDown = useCallback<NonNullable<InputProps['onKeyDown']>>(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitRenameCase();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeRenameCaseDialog();
      }
    },
    [submitRenameCase, closeRenameCaseDialog]
  );

  const opQuery = useOperationQuery(subgraphId);
  // Tool subgraphs (MCP servers, agent tools) resolve their own connector art; only pass it through when it is real
  // artwork or a family-colored built-in glyph so unmapped tools keep ToolItemCard's kind-specific default glyph.
  const toolIconUri = useIconUri(subgraphId);
  const toolIcon = useOperationNodeIcon(node?.type ?? '', node?.kind, toolIconUri || undefined, opQuery.isLoading);
  const useToolIcon = sharedTool && (toolIcon.artwork || (toolIcon.tone !== undefined && toolIcon.tone !== 'neutral'));
  const errorInfo = useOperationErrorInfo(subgraphId);
  const settingValidationErrors = useSettingValidationErrors(subgraphId);
  const parameterValidationErrors = useParameterValidationErrors(subgraphId);
  const flowErrors = useFlowErrorsForNode(subgraphId);

  const { errorMessages } = useMemo(() => {
    const allMessages: string[] = [];

    if (errorInfo && errorInfo.level !== ErrorLevel.DynamicOutputs) {
      const { message } = errorInfo;
      allMessages.push(message);
    }

    if (opQuery.isError) {
      allMessages.push(intlText.opManifestErrorText);
    }

    if (settingValidationErrors?.length > 0) {
      allMessages.push(intlText.settingValidationErrorText);
    }

    if (parameterValidationErrors?.length > 0) {
      allMessages.push(intlText.parameterValidationErrorText);
    }

    if (flowErrors?.length > 0) {
      allMessages.push(intlText.flowErrorText);
    }

    return { errorMessages: allMessages };
  }, [
    errorInfo,
    opQuery.isError,
    settingValidationErrors?.length,
    parameterValidationErrors?.length,
    flowErrors?.length,
    intlText.opManifestErrorText,
    intlText.settingValidationErrorText,
    intlText.parameterValidationErrorText,
    intlText.flowErrorText,
  ]);

  const nodeIndex = useNodeIndex(subgraphId);
  const shouldShowPager =
    isMonitoringView &&
    (normalizedType === constants.NODE.TYPE.UNTIL || (isParentAgent && (metadata?.runData?.repetitionCount ?? 0) > 1)) &&
    (!sharedTool || hasCurrentToolMonitoringData);
  const handleAxis = data?.handleAxis === 'horizontal' ? 'horizontal' : 'vertical';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', ...(shared && presentation.size) }}>
          {sharedTool ? null : <DefaultHandle axis={handleAxis} type="target" />}
          {metadata?.subgraphType ? (
            <>
              {shared && isAddCase ? (
                readOnly ? null : (
                  <div
                    // Keep the add-button center aligned with the shared 232x44 ELK slot used for add-case ports/anchors.
                    style={{
                      width: '100%',
                      height: presentation.size?.height ?? nodeMetrics.actionAdd.containerHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <NodeAddButton
                      label={isAgentAddTool ? intlText.addTool : intlText.addCase}
                      onClick={() => subgraphClick(subgraphId)}
                      tabIndex={nodeIndex}
                    />
                  </div>
                )
              ) : shared ? (
                <SharedBranchCard
                  id={subgraphId}
                  title={title}
                  subgraphType={metadata.subgraphType}
                  toolKind={presentation.toolKind}
                  icon={useToolIcon ? toolIcon.icon : undefined}
                  selectedIcon={useToolIcon ? toolIcon.selectedIcon : undefined}
                  iconTone={useToolIcon ? toolIcon.tone : undefined}
                  iconArtwork={useToolIcon ? toolIcon.artwork : undefined}
                  handleAxis={handleAxis}
                  inputSlot={sharedTool ? <DefaultHandle axis={handleAxis} type="target" /> : undefined}
                  outputSlot={sharedTool ? <DefaultHandle axis={handleAxis} type="source" /> : undefined}
                  selected={selected}
                  pinned={isPinned}
                  active={isMonitoringView ? !isNullOrUndefined((sharedTool ? effectiveToolRunData : runData)?.status) : true}
                  onClick={() =>
                    subgraphClick(
                      metadata.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE ||
                        metadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION ||
                        metadata.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT
                        ? subgraphId
                        : metadata.graphId
                    )
                  }
                  onContextMenu={onContextMenu}
                  onDeleteClick={deleteClick}
                  collapsed={graphCollapsed}
                  onCollapse={handleGraphCollapse}
                  errorMessages={errorMessages}
                  descendantErrorCount={descendantErrorCount}
                  nodeIndex={nodeIndex}
                  runData={effectiveToolRunData}
                  description={opQuery.data?.properties?.description}
                  isMonitoringView={isMonitoringView}
                  countLabel={sharedOwnsCount && graphCollapsed ? { count: actionCount, unit: 'actions' } : undefined}
                  falseBranchGlyph={
                    metadata.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_FALSE || metadata.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_TRUE
                      ? 'neutral'
                      : undefined
                  }
                  onRenameClick={metadata.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE ? renameCase : undefined}
                  onMoreClick={
                    metadata.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE && !readOnly && !isMonitoringView
                      ? openContextMenuAtElement
                      : undefined
                  }
                />
              ) : (
                <SubgraphCard
                  id={subgraphId}
                  active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true}
                  parentId={metadata?.graphId}
                  subgraphType={metadata.subgraphType}
                  title={title}
                  isSelected={selected}
                  isPinned={isPinned}
                  readOnly={readOnly}
                  onClick={subgraphClick}
                  onContextMenu={onContextMenu}
                  onDeleteClick={deleteClick}
                  collapsed={graphCollapsed}
                  handleCollapse={handleGraphCollapse}
                  errorMessages={errorMessages}
                  nodeIndex={nodeIndex}
                />
              )}
              {shouldShowPager ? (
                shared ? (
                  <SharedLoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} />
                ) : (
                  <LoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} />
                )
              ) : null}
            </>
          ) : null}
          {sharedTool ? null : <DefaultHandle axis={handleAxis} type="source" />}
        </div>
      </div>
      {graphCollapsed && !sharedOwnsCount ? (
        <p className="no-actions-text" data-automation-id={`subgraph-${id}-no-actions`}>
          {intlText.collapsedText}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">{intlText.noActions}</p>
        ) : (
          <div className={'edge-drop-zone-container'} style={shared && handleAxis === 'horizontal' ? horizontalTerminalStyle : undefined}>
            <DropZone
              graphId={subgraphId}
              parentId={id}
              isLeaf={isLeaf}
              tabIndex={nodeIndex}
              axis={handleAxis}
              {...(data?.presentation ? { sharedPresentation: shared } : {})}
            />
          </div>
        )
      ) : null}
      <Dialog open={isRenameCaseDialogOpen} onOpenChange={onRenameCaseOpenChange}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{intlText.renameCaseTitle}</DialogTitle>
            <DialogContent>
              <Field
                label={intlText.renameCaseInputLabel}
                validationState={renameCaseError ? 'error' : undefined}
                validationMessage={renameCaseError}
              >
                <Input autoFocus value={renameCaseDraft} onChange={onRenameCaseDraftChange} onKeyDown={onRenameCaseDraftKeyDown} />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={closeRenameCaseDialog}>
                {intlText.renameCaseCancel}
              </Button>
              <Button appearance="primary" onClick={submitRenameCase}>
                {intlText.renameCaseSave}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
