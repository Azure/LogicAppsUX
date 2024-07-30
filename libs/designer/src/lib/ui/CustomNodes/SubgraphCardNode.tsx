/* eslint-disable @typescript-eslint/no-empty-function */
import constants from '../../common/constants';
import { useOperationInfo, type AppDispatch } from '../../core';
import { initializeSwitchCaseFromManifest } from '../../core/actions/bjsworkflow/add';
import { getOperationManifest } from '../../core/queries/operation';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { useIconUri, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { useIsNodePinnedToOperationPanel } from '../../core/state/panelV2/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewSwitchCaseId,
  useNodeDisplayName,
  useNodeMetadata,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { addSwitchCase, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { DropZone } from '../connections/dropzone';
import { DeleteMenuItem } from '../menuItems/deleteMenuItem';
import { MessageBarType } from '@fluentui/react';
import { SubgraphCard } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES, removeIdTag, useNodeIndex } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Handle, Position, type NodeProps } from '@xyflow/react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubgraphCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const subgraphId = removeIdTag(id);
  const node = useActionMetadata(subgraphId);

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();

  const isPinned = useIsNodePinnedToOperationPanel(subgraphId);
  const selected = useIsNodeSelected(subgraphId);
  const isLeaf = useIsLeafNode(id);
  const metadata = useNodeMetadata(subgraphId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const operationInfo = useOperationInfo(graphId);
  const isMonitoringView = useMonitoringView();
  const normalizedType = node?.type.toLowerCase();

  const title = useNodeDisplayName(subgraphId);

  const isAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;

  const iconUri = useIconUri(graphId);

  const newCaseId = useNewSwitchCaseId();
  const subgraphClick = useCallback(
    async (_id: string) => {
      if (isAddCase && graphNode) {
        dispatch(addSwitchCase({ caseId: newCaseId, nodeId: subgraphId }));
        const rootManifest = await getOperationManifest(operationInfo);
        if (!rootManifest?.properties?.subGraphDetails) {
          return;
        }
        const caseManifestData = Object.values(rootManifest.properties.subGraphDetails).find((data) => data.isAdditive);
        const subGraphManifest = {
          properties: { ...caseManifestData, iconUri: iconUri ?? '', brandColor: '' },
        };
        initializeSwitchCaseFromManifest(newCaseId, subGraphManifest, dispatch);
        dispatch(changePanelNode(newCaseId));
        dispatch(setFocusNode(newCaseId));
      } else {
        dispatch(changePanelNode(_id));
      }
    },
    [isAddCase, graphNode, dispatch, newCaseId, subgraphId, operationInfo, iconUri]
  );

  const graphCollapsed = useIsGraphCollapsed(subgraphId);
  const handleGraphCollapse = useCallback(() => {
    dispatch(toggleCollapsedGraphId(subgraphId));
  }, [dispatch, subgraphId]);

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

  const contextMenuItems: JSX.Element[] = useMemo(
    () => [
      ...(metadata?.subgraphType === SUBGRAPH_TYPES['SWITCH_CASE']
        ? [<DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />]
        : []),
    ],
    [deleteClick, metadata?.subgraphType]
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          {metadata?.subgraphType ? (
            <>
              <SubgraphCard
                id={subgraphId}
                parentId={metadata?.graphId}
                subgraphType={metadata.subgraphType}
                title={title}
                selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
                readOnly={readOnly}
                onClick={subgraphClick}
                collapsed={graphCollapsed}
                handleCollapse={handleGraphCollapse}
                contextMenuItems={contextMenuItems}
                errorLevel={errorLevel}
                errorMessage={errorMessage}
                nodeIndex={nodeIndex}
              />
              {isMonitoringView && normalizedType === constants.NODE.TYPE.UNTIL ? (
                <LoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} />
              ) : null}
            </>
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
      {graphCollapsed ? <p className="no-actions-text">{collapsedText}</p> : null}
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
