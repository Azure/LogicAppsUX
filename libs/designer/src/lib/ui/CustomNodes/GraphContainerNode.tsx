import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { GraphContainer } from '@microsoft/designer-ui';
import { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GraphContainerNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const selected = useIsNodeSelected(id);

  return (
    <div className="msla-graph-container-wrapper">
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <GraphContainer selected={selected} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);
