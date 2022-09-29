import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import type { WorkflowNodeType } from '@microsoft-logic-apps/utils';
import { MiniMap } from 'reactflow';

const Minimap = () => {
  const showMinimap = useShowMinimap();
  if (!showMinimap) return null;

  const nodeColors: Record<WorkflowNodeType, any> = {
    OPERATION_NODE: { fill: '#ECECEC', stroke: '#A19F9D' },
    GRAPH_NODE: { fill: '#FFF', stroke: '#A19F9D' },
    SUBGRAPH_NODE: { fill: '#FFF', stroke: '#A19F9D' },
    SCOPE_CARD_NODE: { fill: '#1f85ff', stroke: '#1f85ff' },
    SUBGRAPH_CARD_NODE: { fill: '#486991', stroke: '#486991' },
    HIDDEN_NODE: { fill: '#00000000', stroke: '#00000000' },
    PLACEHOLDER_NODE: { fill: '#ECECEC', stroke: '#A19F9D' },
  };
  const nodeColor = (node: any) => nodeColors[node.type as WorkflowNodeType].fill;
  const nodeStrokeColor = (node: any) => nodeColors[node.type as WorkflowNodeType].stroke;

  return <MiniMap nodeColor={nodeColor} nodeStrokeColor={nodeStrokeColor} nodeStrokeWidth={3} nodeBorderRadius={0} />;
};

export default Minimap;
