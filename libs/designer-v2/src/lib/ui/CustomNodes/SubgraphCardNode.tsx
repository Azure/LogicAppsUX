import constants from '../../common/constants';
import { useOperationInfo, type AppDispatch } from '../../core';
import { initializeSubgraphFromManifest } from '../../core/actions/bjsworkflow/add';
import { getOperationManifest } from '../../core/queries/operation';
import { useMonitoringView, useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { useIconUri, useOperationErrorInfo, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodeSelectedInOperationPanel, useIsNodePinnedToOperationPanel } from '../../core/state/panel/panelSelectors';
import { addAgentToolMetadata, changePanelNode, expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import {
  useActionMetadata,
  useFlowErrorsForNode,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewAdditiveSubgraphId,
  useNodeDisplayName,
  useNodeMetadata,
  useParentNodeId,
  useRunData,
  useRunIndex,
  useRunInstance,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { addSwitchCase, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { fetchBuiltInToolRunData } from '../../core/actions/bjsworkflow/monitoring';
import { getScopeRepetitionName } from '../common/LoopsPager/helper';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { DropZone } from '../connections/dropzone';
import {
  WORKFLOW_NODE_TYPES,
  isBuiltInAgentTool,
  SUBGRAPH_TYPES,
  guid,
  isNullOrUndefined,
  removeIdTag,
  useNodeIndex,
} from '@microsoft/logic-apps-shared';
import { memo, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { SubgraphCard } from './components/card/subgraphCard';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { ErrorLevel } from '../../core/state/operation/operationMetadataSlice';
import { useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import { SharedBranchCard } from './components/card/SharedFamilyCards';
import { NodeAddButton } from '@microsoft/designer-ui-v2';

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
      hasToolStatus: !!(metadata?.toolRunData ?? metadata?.runData)?.status,
    });
  const shared = presentation.shared;
  const sharedTool = shared && presentation.family === 'tool';
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const operationInfo = useOperationInfo(graphId);
  const isMonitoringView = useMonitoringView();
  const normalizedType = node?.type.toLowerCase();
  const parentNodeId = useParentNodeId(subgraphId);
  const runData = useRunData(parentNodeId ?? subgraphId);
  const parentActionMetadata = useActionMetadata(parentNodeId);
  const isParentAgent = parentActionMetadata?.type?.toLowerCase() === constants.NODE.TYPE.AGENT;

  const title = useNodeDisplayName(subgraphId);
  const runInstance = useRunInstance();
  const agentRunIndex = useRunIndex(graphId);

  const isSwitchAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
  const isAgentAddTool = metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON;

  const isAddCase = isSwitchAddCase || isAgentAddTool;
  const actionCount = metadata?.actionCount ?? 0;
  const iconUri = useIconUri(graphId);

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
        // For built-in tools in monitoring view, fetch inputs/outputs if not already loaded
        if (isMonitoringView && isBuiltInAgentTool(_id) && !metadata?.runData?.inputs && runInstance?.id && graphId) {
          dispatch(
            fetchBuiltInToolRunData({
              toolNodeId: _id,
              agentNodeId: graphId,
              runId: runInstance.id,
              repetitionName: getScopeRepetitionName(agentRunIndex),
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
      agentRunIndex,
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

  const opQuery = useOperationQuery(subgraphId);
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
    isMonitoringView && (normalizedType === constants.NODE.TYPE.UNTIL || (isParentAgent && (metadata?.runData?.repetitionCount ?? 0) > 1));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', ...(shared && presentation.size) }}>
          {sharedTool ? null : <DefaultHandle type="target" />}
          {metadata?.subgraphType ? (
            <>
              {shared && isAddCase ? (
                readOnly ? null : (
                  <NodeAddButton
                    label={isAgentAddTool ? intlText.addTool : intlText.addCase}
                    onClick={() => subgraphClick(subgraphId)}
                    tabIndex={nodeIndex}
                  />
                )
              ) : shared ? (
                <SharedBranchCard
                  id={subgraphId}
                  title={title}
                  subgraphType={metadata.subgraphType}
                  toolKind={presentation.toolKind}
                  inputSlot={sharedTool ? <DefaultHandle type="target" /> : undefined}
                  outputSlot={sharedTool ? <DefaultHandle type="source" /> : undefined}
                  selected={selected}
                  pinned={isPinned}
                  active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true}
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
                  nodeIndex={nodeIndex}
                  runData={metadata.toolRunData ?? metadata.runData}
                  description={opQuery.data?.properties?.description}
                  isMonitoringView={isMonitoringView}
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
              {shouldShowPager ? <LoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} /> : null}
            </>
          ) : null}
          {sharedTool ? null : <DefaultHandle type="source" />}
        </div>
      </div>
      {graphCollapsed ? (
        <p className="no-actions-text" data-automation-id={`subgraph-${id}-no-actions`}>
          {intlText.collapsedText}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">{intlText.noActions}</p>
        ) : (
          <div className={'edge-drop-zone-container'}>
            <DropZone
              graphId={subgraphId}
              parentId={id}
              isLeaf={isLeaf}
              tabIndex={nodeIndex}
              {...(data?.presentation ? { sharedPresentation: shared } : {})}
            />
          </div>
        )
      ) : null}
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
