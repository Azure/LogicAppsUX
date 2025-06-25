import { Handle, type Position } from '@xyflow/react';

export const EdgeDrawTargetHandle = (props: { targetPosition: Position }) => {
  return (
    <Handle
      className="node-handle top"
      type="target"
      position={props.targetPosition}
      isConnectable={true}
      isConnectableStart={false}
      isConnectableEnd={true}
    />
  );
};
