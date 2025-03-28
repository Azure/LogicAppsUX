/* eslint-disable @typescript-eslint/no-empty-function */
import constants from '../../common/constants';
import { useOperationInfo, useSubgraphRepetition, type AppDispatch } from '../../core';
import { initializeSwitchCaseFromManifest } from '../../core/actions/bjsworkflow/add';
import { getOperationManifest } from '../../core/queries/operation';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { useIconUri, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel, useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewAdditiveSubgraphId,
  useNodeDisplayName,
  useNodeMetadata,
  useNodesMetadata,
  useParentNodeId,
  useRunData,
  useRunIndex,
  useRunInstance,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { addAgentCondition, addSwitchCase, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { DropZone } from '../connections/dropzone';
import { MessageBarType } from '@fluentui/react';
import { SubgraphCard } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES, isNullOrUndefined, removeIdTag, useNodeIndex } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getRepetitionName } from '../common/LoopsPager/helper';
import { useAllOperations } from '../../core/state/selectors/actionMetadataSelector';

const SubgraphCardNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const subgraphId = removeIdTag(id);
  const node = useActionMetadata(subgraphId);

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();
  const operationsInfo = useAllOperations();
  const isPinned = useIsNodePinnedToOperationPanel(subgraphId);
  const selected = useIsNodeSelectedInOperationPanel(subgraphId);
  const isLeaf = useIsLeafNode(id);
  const metadata = useNodeMetadata(subgraphId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const operationInfo = useOperationInfo(graphId);
  const isMonitoringView = useMonitoringView();
  const normalizedType = node?.type.toLowerCase();
  const parentNodeId = useParentNodeId(subgraphId);
  const runData = useRunData(parentNodeId ?? subgraphId);
  const parentActionMetadata = useActionMetadata(parentNodeId);
  const isParentAgent = parentActionMetadata?.type?.toLowerCase() === constants.NODE.TYPE.AGENT;
  const runIndex = useRunIndex(subgraphId);
  const nodesMetaData = useNodesMetadata();
  const runInstance = useRunInstance();

  const repetitionName = useMemo(
    () => getRepetitionName(runIndex, subgraphId, nodesMetaData, operationsInfo),
    [nodesMetaData, runIndex, subgraphId, operationsInfo]
  );

  const title = useNodeDisplayName(subgraphId);

  const isSwitchAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
  const isAgentAddCondition = metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON;

  const isAddCase = isSwitchAddCase || isAgentAddCondition;

  const iconUri = useIconUri(graphId);

  const newCaseIdNewAdditiveSubgraphId = useNewAdditiveSubgraphId(isAgentAddCondition ? 'Condition' : 'Case');
  const subgraphClick = useCallback(
    async (_id: string) => {
      if (isAddCase && graphNode) {
        if (isAgentAddCondition) {
          dispatch(addAgentCondition({ conditionId: newCaseIdNewAdditiveSubgraphId, nodeId: subgraphId }));
        } else {
          dispatch(addSwitchCase({ caseId: newCaseIdNewAdditiveSubgraphId, nodeId: subgraphId }));
        }

        const rootManifest = await getOperationManifest(operationInfo);
        if (!rootManifest?.properties?.subGraphDetails) {
          return;
        }
        const caseManifestData = Object.values(rootManifest.properties.subGraphDetails).find((data) => data.isAdditive);
        const subGraphManifest = {
          properties: { ...caseManifestData, iconUri: iconUri ?? '', brandColor: '' },
        };
        initializeSwitchCaseFromManifest(newCaseIdNewAdditiveSubgraphId, subGraphManifest, dispatch);
        dispatch(changePanelNode(newCaseIdNewAdditiveSubgraphId));
        dispatch(setFocusNode(newCaseIdNewAdditiveSubgraphId));
      } else {
        dispatch(changePanelNode(_id));
      }
    },
    [isAddCase, graphNode, isAgentAddCondition, operationInfo, iconUri, newCaseIdNewAdditiveSubgraphId, dispatch, subgraphId]
  );

  const graphCollapsed = useIsGraphCollapsed(subgraphId);
  const handleGraphCollapse = useCallback(
    (includeNested?: boolean) => {
      dispatch(toggleCollapsedGraphId({ id: subgraphId, includeNested }));
    },
    [dispatch, subgraphId]
  );

  const { isFetching: isRepetitionFetching, data: repetitionRunData } = useSubgraphRepetition(
    !!isMonitoringView,
    isParentAgent,
    subgraphId,
    runInstance?.id,
    repetitionName,
    runData?.status,
    runIndex
  );

  console.log('charlie', subgraphId, runIndex, repetitionName, repetitionRunData, isRepetitionFetching);

  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isAddCase;

  const actionCount = metadata?.actionCount ?? 0;
  const collapsedText = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      id: 'B/JzwK',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

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

  const parameterValidationErrors = useParameterValidationErrors(subgraphId);
  const parameterValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid parameters',
    id: 'Tmr/9e',
    description: 'Text to explain that there are invalid parameters for this node',
  });

  const { errorMessage, errorLevel } = useMemo(() => {
    if (parameterValidationErrors?.length > 0) {
      return { errorMessage: parameterValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }
    return { errorMessage: undefined, errorLevel: undefined };
  }, [parameterValidationErrors?.length, parameterValidationErrorText]);

  const nodeIndex = useNodeIndex(subgraphId);
  const shouldShowPager =
    isMonitoringView && (normalizedType === constants.NODE.TYPE.UNTIL || (isParentAgent && (metadata?.runData?.repetitionCount ?? 0) > 1));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          {metadata?.subgraphType ? (
            <>
              <SubgraphCard
                id={subgraphId}
                active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true}
                parentId={metadata?.graphId}
                subgraphType={metadata.subgraphType}
                title={title}
                selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
                readOnly={readOnly}
                onClick={subgraphClick}
                onContextMenu={onContextMenu}
                onDeleteClick={deleteClick}
                collapsed={graphCollapsed}
                handleCollapse={handleGraphCollapse}
                errorLevel={errorLevel}
                errorMessage={errorMessage}
                nodeIndex={nodeIndex}
              />
              {shouldShowPager ? <LoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} /> : null}
            </>
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
      {graphCollapsed ? (
        <p className="no-actions-text" data-automation-id={`subgraph-${id}-no-actions`}>
          {collapsedText}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">No Actions</p>
        ) : (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={subgraphId} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
          </div>
        )
      ) : null}
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
