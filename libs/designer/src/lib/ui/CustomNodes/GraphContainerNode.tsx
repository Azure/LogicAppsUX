import type { WorkflowGraph } from '../../core/parsers/models/workflowNode';
import { useWorkflowNode } from '../../core/state/selectors/workflowNodeSelector';
import { GraphContainer } from '@microsoft/designer-ui';
import { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GraphContainerNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const graph = useWorkflowNode(id) as WorkflowGraph;
  const isEmptyGraph = !graph?.edges && (graph?.children?.[0] as any)?.children.length === 0;

  if (isEmptyGraph) {
    return null;
  }

  return (
    <div className="msla-graph-container-wrapper">
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <GraphContainer />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);
