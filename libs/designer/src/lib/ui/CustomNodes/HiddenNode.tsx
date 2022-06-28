import { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HiddenNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  return (
    <div>
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

HiddenNode.displayName = 'HiddenNode';

export default memo(HiddenNode);
