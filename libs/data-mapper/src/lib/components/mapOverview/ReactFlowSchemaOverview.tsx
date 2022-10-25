import type { SchemaExtended } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useLayout } from '../../utils/ReactFlow.Util';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow from 'reactflow';

const reactFlowStyle = {
  background: '#e0e0e0',
  height: '100%',
};

// Using this to prevent infinite re-rendering
const placeholderData = {
  currentlySelectedSourceNodes: [],
  connectedSourceNodes: [],
  allSourceNodes: {},
  addedFunctionNodes: {},
  functionConnectionUnits: [],
  //currentTargetNode, - This is the one thing that has an actual value (schema.schemaTreeRoot)
  connections: {},
  selectedItemKey: undefined,
};

interface ReactFlowSchemaOverviewProps {
  schema: SchemaExtended;
}

export const ReactFlowSchemaOverview = ({ schema }: ReactFlowSchemaOverviewProps) => {
  const [reactFlowNodes, _reactFlowEdges] = useLayout(
    placeholderData.currentlySelectedSourceNodes,
    placeholderData.connectedSourceNodes,
    placeholderData.allSourceNodes,
    placeholderData.addedFunctionNodes,
    placeholderData.functionConnectionUnits,
    schema.schemaTreeRoot,
    placeholderData.connections,
    placeholderData.selectedItemKey
  );

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
