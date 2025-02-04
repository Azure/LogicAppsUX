import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { setNodeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import type { AppDispatch } from '../../core';
import { useDispatch } from 'react-redux';

const CollapsedNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: id,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, id]
  );

  return (
    <div
      style={{
        width: 200,
        height: 50,
      }}
    >
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <CollapsedCard id="testId" onContextMenu={onContextMenu} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
