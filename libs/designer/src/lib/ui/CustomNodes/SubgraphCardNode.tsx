/* eslint-disable @typescript-eslint/no-empty-function */
import type { AppDispatch } from '../../core';
import { initializeSwitchCaseFromManifest } from '../../core/actions/bjsworkflow/add';
import { deleteGraphNode } from '../../core/actions/bjsworkflow/delete';
import { getOperationManifest } from '../../core/queries/operation';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import { useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import {
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewSwitchCaseId,
  useNodeMetadata,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { addSwitchCase, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { DropZone } from '../connections/dropzone';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { DeleteNodeModal, MenuItemType, SubgraphCard } from '@microsoft/designer-ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SubgraphCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const subgraphId = id.split('-#')[0];

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();

  const selected = useIsNodeSelected(subgraphId);
  const isLeaf = useIsLeafNode(id);
  const metadata = useNodeMetadata(subgraphId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const subgraphNode = useWorkflowNode(subgraphId);
  const operationInfo = useOperationInfo(graphId);

  const isAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;

  const newCaseId = useNewSwitchCaseId();
  const subgraphClick = useCallback(
    async (_id: string) => {
      if (isAddCase && graphNode) {
        dispatch(addSwitchCase({ caseId: newCaseId, nodeId: subgraphId }));
        const rootManifest = await getOperationManifest(operationInfo);
        if (!rootManifest?.properties?.subGraphDetails) return;
        const caseManifestData = Object.values(rootManifest.properties.subGraphDetails).find((data) => data.isAdditive);
        const subGraphManifest = { properties: { ...caseManifestData, iconUri: '', brandColor: '' } };
        initializeSwitchCaseFromManifest(newCaseId, subGraphManifest, dispatch);
        dispatch(changePanelNode(newCaseId));
        dispatch(setFocusNode(newCaseId));
      } else {
        dispatch(changePanelNode(_id));
      }
    },
    [dispatch, isAddCase, newCaseId, graphNode, operationInfo, subgraphId]
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
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleDelete = () => subgraphNode && dispatch(deleteGraphNode({ graphId: subgraphId, graphNode: subgraphNode }));

  const getDeleteMenuItem = () => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });

    return {
      key: deleteDescription,
      disabled: readOnly || true, // TODO: This is disabled right now because delete does not work 100% correctly
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const contextMenuOptions: MenuItemOption[] = [];
  if (metadata?.subgraphType === SUBGRAPH_TYPES['SWITCH_CASE']) contextMenuOptions.push(getDeleteMenuItem());

  return (
    <div>
      <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          {metadata?.subgraphType ? (
            <SubgraphCard
              id={subgraphId}
              parentId={metadata?.graphId}
              subgraphType={metadata.subgraphType}
              selected={selected}
              readOnly={readOnly}
              onClick={subgraphClick}
              collapsed={graphCollapsed}
              handleCollapse={handleGraphCollapse}
              contextMenuOptions={contextMenuOptions}
            />
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
      {graphCollapsed ? <p className="no-actions-text">{collapsedText}</p> : null}
      {showEmptyGraphComponents ? (
        !readOnly ? (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={subgraphId} parentId={id} />
          </div>
        ) : (
          <p className="no-actions-text">No Actions</p>
        )
      ) : null}
      <DeleteNodeModal
        nodeId={id}
        // nodeIcon={iconUriResult.result}
        // brandColor={brandColor}
        nodeType={WORKFLOW_NODE_TYPES.SUBGRAPH_NODE}
        isOpen={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
