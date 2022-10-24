// eslint-disable-next-line import/no-named-as-default
import type { SchemaExtended } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useLayout } from '../../utils/ReactFlow.Util';
import ReactFlow from 'reactflow';

const reactFlowStyle = {
  background: '#e0e0e0',
  height: '100%',
};

interface ReactFlowSchemaOverviewProps {
  schema: SchemaExtended;
}

export const ReactFlowSchemaOverview = ({ schema }: ReactFlowSchemaOverviewProps) => {
  const [reactFlowNodes, _reactFlowEdges] = useLayout([], [], {}, {}, schema.schemaTreeRoot, {}, undefined);

  return (
    <ReactFlow
      nodes={reactFlowNodes}
      nodesDraggable={false}
      panOnDrag={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      zoomOnScroll={false}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
      nodeTypes={nodeTypes}
      style={reactFlowStyle}
      fitView
    />
  );
};
