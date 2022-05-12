/* eslint-disable @typescript-eslint/no-empty-function */
import { expandPanel, changePanelNode } from '../../core/state/panelSlice';
import { useBrandColor, useIconUri, useNodeDescription, useNodeMetadata } from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesByChild, useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import type { RootState } from '../../core/store';
import { DropZone } from '../connections/dropzone';
import { Card } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);
  const [, drag, dragPreview] = useDrag(() => ({
    // "type" is required. It is used by the "accept" specification of drop targets.
    type: 'BOX',
    // The collect function utilizes a "monitor" instance (see the Overview for what this is)
    // to pull important pieces of state from the DnD system.
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ parent: string; child: string }>();
      if (item && dropResult) {
        alert(`You dropped ${id} between ${dropResult.parent} and  ${dropResult.child}!`);
      }
    },
    item: {
      id: id,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const childEdges = useEdgesByParent(id);
  const parentEdges = useEdgesByChild(id);
  const metadata = useNodeMetadata(id);
  const hasNestedParent = metadata?.graphId !== 'root';
  const dispatch = useDispatch();
  const style = hasNestedParent && !parentEdges.length ? { marginTop: 40 } : undefined;
  const brandColor = useBrandColor(id) ?? '';
  const iconURI = useIconUri(id) ?? '';
  const nodeComment = useNodeDescription(id) ?? '';

  const nodeClick = useCallback(() => {
    if (isCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(id));
  }, [dispatch, id, isCollapsed]);

  if (metadata?.isPlaceholderNode) {
    return (
      <div style={{ ...{ display: 'grid', placeItems: 'center', width: 200, height: 30, marginTop: '5px' }, ...style }}>
        <DropZone graphId={metadata?.graphId ?? ''} />
      </div>
    );
  }
  return (
    <div style={style}>
      {hasNestedParent && !parentEdges.length && (
        <div style={{ display: 'grid', placeItems: 'center', width: 200, height: 30, marginTop: '5px', marginBottom: 5, marginLeft: 2 }}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      )}
      <div>
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ transform: 'translate(0, 50%)', visibility: 'hidden' }}
        />
        <Card
          title={data.label}
          icon={iconURI}
          draggable={true}
          brandColor={brandColor}
          id={id}
          connectionRequired={true}
          connectionDisplayName="ttha222@outlook.com"
          commentBox={{
            brandColor: brandColor,
            comment: nodeComment,
            isDismissed: false,
            isEditing: false,
          }}
          drag={drag}
          dragPreview={dragPreview}
          onClick={nodeClick}
        />
        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', transform: 'translate(0, -50%)' }}
        />
      </div>
      {childEdges.length === 0 && (
        <div style={{ display: 'grid', placeItems: 'center', width: 200, height: 30, marginTop: '5px' }}>
          <DropZone graphId={metadata?.graphId ?? ''} parent={id} />
        </div>
      )}
    </div>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
