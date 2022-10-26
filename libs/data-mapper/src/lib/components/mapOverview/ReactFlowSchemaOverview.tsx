import type { SchemaExtended, SchemaType } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useOverviewLayout } from '../../utils/ReactFlow.Util';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow from 'reactflow';

const reactFlowStyle = {
  height: '100%',
};

interface ReactFlowSchemaOverviewProps {
  schema: SchemaExtended;
  schemaType: SchemaType;
}

export const ReactFlowSchemaOverview = ({ schema, schemaType }: ReactFlowSchemaOverviewProps) => {
  const reactFlowNodes = useOverviewLayout(schema.schemaTreeRoot, schemaType, true);

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
