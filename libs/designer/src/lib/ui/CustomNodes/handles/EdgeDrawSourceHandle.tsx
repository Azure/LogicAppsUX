import { Handle, type Position } from '@xyflow/react';
import { useReadOnly, useShowEdgeDrawing } from '../../../core/state/designerOptions/designerOptionsSelectors';

export const EdgeDrawSourceHandle = (props: { sourcePosition: Position }) => {
  const readOnly = useReadOnly();
  const showEdgeDrawing = useShowEdgeDrawing();

  return (
    <Handle
      className="node-handle bottom edge-draw-start"
      type="source"
      position={props.sourcePosition}
      isConnectable={true}
      isConnectableStart={true}
      isConnectableEnd={false}
      style={
        readOnly || !showEdgeDrawing
          ? {
              visibility: 'hidden',
              transform: 'translate(-50%, 0)',
            }
          : {}
      }
    />
  );
};
