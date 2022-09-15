/* eslint-disable @typescript-eslint/no-empty-function */
import type { AppDispatch } from '../../core';
import { deleteOperation } from '../../core/actions/bjsworkflow/delete';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import {
  useBrandColor,
  useIconUri,
  useIsConnectionRequired,
  useNodeConnectionName,
  useOperationInfo,
} from '../../core/state/selectors/actionMetadataSelector';
import { useIsLeafNode, useNodeDescription, useNodeDisplayName, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from '../connections/dropzone';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { Card, MenuItemType, DeleteNodeModal } from '@microsoft/designer-ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const DefaultNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();

  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);

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
          dispatch(
            moveOperation({
              nodeId: id,
              oldGraphId: metadata?.graphId ?? 'root',
              newGraphId: dropResult.graphId,
              relationshipIds: dropResult,
            })
          );
        }
      },
      item: {
        id: id,
      },
      canDrag: !readOnly && !isTrigger,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata]
  );

  const selected = useIsNodeSelected(id);
  const nodeComment = useNodeDescription(id);
  const connectionResult = useNodeConnectionName(id);
  const isConnectionRequired = useIsConnectionRequired(operationInfo);
  const isLeaf = useIsLeafNode(id);

  const showLeafComponents = useMemo(() => !readOnly && isLeaf, [readOnly, isLeaf]);

  const nodeClick = useCallback(() => dispatch(changePanelNode(id)), [dispatch, id]);

  const brandColorResult = useBrandColor(operationInfo);
  const iconUriResult = useIconUri(operationInfo);

  const brandColor = brandColorResult.result;
  const comment = useMemo(
    () =>
      nodeComment
        ? {
            brandColor,
            comment: nodeComment,
            isDismissed: false,
            isEditing: false,
          }
        : undefined,
    [brandColor, nodeComment]
  );

  const label = useNodeDisplayName(id);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleDelete = () => dispatch(deleteOperation({ nodeId: id }));

  const getDeleteMenuItem = () => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });

    const disableTriggerDeleteText = intl.formatMessage({
      defaultMessage: 'Triggers cannot be deleted.',
      description: 'Text to explain that triggers cannot be deleted',
    });

    return {
      key: deleteDescription,
      disabled: readOnly || isTrigger,
      disabledReason: disableTriggerDeleteText,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const contextMenuOptions: MenuItemOption[] = [getDeleteMenuItem()];

  return (
    <>
      <div>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <Card
          title={label}
          icon={iconUriResult.result}
          draggable={!readOnly && !isTrigger}
          brandColor={brandColor}
          id={id}
          connectionRequired={isConnectionRequired}
          connectionDisplayName={connectionResult.isLoading ? '...' : connectionResult.result}
          commentBox={comment}
          drag={drag}
          dragPreview={dragPreview}
          isDragging={isDragging}
          isLoading={iconUriResult.isLoading}
          isMonitoringView={isMonitoringView}
          readOnly={readOnly}
          onClick={nodeClick}
          selected={selected}
          contextMenuOptions={contextMenuOptions}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} />
        </div>
      ) : null}
      <DeleteNodeModal
        nodeId={id}
        // nodeIcon={iconUriResult.result}
        // brandColor={brandColor}
        nodeType={WORKFLOW_NODE_TYPES.OPERATION_NODE}
        isOpen={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
