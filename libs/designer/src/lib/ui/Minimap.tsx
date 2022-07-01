import { MiniMap } from 'react-flow-renderer';

const Minimap = () => {
  const nodeColors: Record<string, any> = {
    TEST_NODE: { fill: '#ECECEC', stroke: '#A19F9D' },
    GRAPH_NODE: { fill: '#FFF', stroke: '#A19F9D' },
    SCOPE_NODE: { fill: '#1f85ff', stroke: '#1f85ff' },
    SUBGRAPH_NODE: { fill: '#486991', stroke: '#486991' },
    HIDDEN_NODE: { fill: '#00000000', stroke: '#00000000' },
  };
  const nodeColor = (node: any) => nodeColors[node.type].fill;
  const nodeStrokeColor = (node: any) => nodeColors[node.type].stroke;

  return <MiniMap nodeColor={nodeColor} nodeStrokeColor={nodeStrokeColor} nodeStrokeWidth={3} nodeBorderRadius={8} />;
};

export default Minimap;
