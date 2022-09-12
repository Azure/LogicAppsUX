import { deleteGraphNode } from '../../core/actions/bjsworkflow/delete';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import type { WorkflowNode } from '../../core/parsers/models/workflowNode';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import { useBrandColor, useIconUri, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNodeDisplayName,
  useNodeMetadata,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import type { AppDispatch } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { DeleteNodeModal, MenuItemType, ScopeCard } from '@microsoft/designer-ui';
import { memo, useCallback, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScopeCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const scopeId = id.split('-#')[0];

  const node = useActionMetadata(scopeId);

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const graphNode = useWorkflowNode(scopeId) as WorkflowNode;
  const operationInfo = useOperationInfo(scopeId);
  const metadata = useNodeMetadata(scopeId);

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: 'BOX',
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{
          graphId: string;
          parentId: string;
          childId: string;
        }>();
        if (item && dropResult) {
          // console.log(`You dropped ${scopeId} between ${dropResult.parentId} and  ${dropResult.childId}!`);
          dispatch(
            moveOperation({
              nodeId: scopeId,
              oldGraphId: metadata?.graphId ?? 'root',
              newGraphId: dropResult.graphId,
              discoveryIds: dropResult,
            })
          );
        }
      },
      item: {
        id: scopeId,
      },
      canDrag: !readOnly,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata]
  );

  const selected = useIsNodeSelected(scopeId);
  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);
  const isLeaf = useIsLeafNode(id);

  const label = useNodeDisplayName(scopeId);
  const nodeClick = useCallback(() => dispatch(changePanelNode(scopeId)), [dispatch, scopeId]);

  const graphCollapsed = useIsGraphCollapsed(scopeId);
  const handleGraphCollapse = useCallback(() => {
    dispatch(toggleCollapsedGraphId(scopeId));
  }, [dispatch, scopeId]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleDelete = () => dispatch(deleteGraphNode({ graphId: scopeId ?? '', graphNode }));

  if (!node) {
    return null;
  }

  const normalizedType = node.type.toLowerCase();
  const actionCount = metadata?.actionCount ?? 0;

  const actionString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

  const caseString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Case} =0 {0 Cases} other {# Cases}}',
      description: 'This is the number of cases or options the program can take',
    },
    { actionCount }
  );

  const collapsedText = normalizedType === 'switch' || normalizedType === 'if' ? caseString : actionString;

  const isFooter = id.endsWith('#footer');
  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isFooter;

  const getDeleteMenuItem = () => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });
    const canDelete = true;

    return {
      key: deleteDescription,
      disabled: readOnly || !canDelete,
      disabledReason: '',
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const contextMenuOptions: MenuItemOption[] = [getDeleteMenuItem()];

  const implementedGraphTypes = ['if', 'switch', 'foreach', 'scope', 'until'];
  if (implementedGraphTypes.includes(normalizedType)) {
    return (
      <>
        <div className="msla-scope-card">
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          <ScopeCard
            brandColor={brandColor.result}
            icon={iconUri.result}
            isLoading={iconUri.isLoading}
            collapsed={graphCollapsed}
            handleCollapse={handleGraphCollapse}
            drag={drag}
            draggable={!readOnly}
            dragPreview={dragPreview}
            isDragging={isDragging}
            id={scopeId}
            isMonitoringView={isMonitoringView}
            title={label}
            readOnly={readOnly}
            onClick={nodeClick}
            selected={selected}
            contextMenuOptions={contextMenuOptions}
          />
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
        {graphCollapsed && !isFooter ? <p className="no-actions-text">{collapsedText}</p> : null}
        {showEmptyGraphComponents ? (
          !readOnly ? (
            <div className={'edge-drop-zone-container'}>
              <DropZone graphId={scopeId} parentId={id} />
            </div>
          ) : (
            <p className="no-actions-text">No Actions</p>
          )
        ) : null}
        <DeleteNodeModal
          nodeId={id}
          // nodeIcon={iconUriResult.result}
          // brandColor={brandColor}
          nodeType={WORKFLOW_NODE_TYPES.GRAPH_NODE}
          isOpen={showDeleteModal}
          onDismiss={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      </>
    );
  } else {
    return <h1>{'GENERIC'}</h1>;
  }
};

ScopeCardNode.displayName = 'ScopeNode';

export default memo(ScopeCardNode);
