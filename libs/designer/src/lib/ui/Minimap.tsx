import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import { useTheme } from '@fluentui/react';
import type { WorkflowNodeType } from '@microsoft/logic-apps-shared';
import { useMemo, useCallback } from 'react';
import type { XYPosition } from '@xyflow/react';
import { MiniMap, useReactFlow } from '@xyflow/react';

const nodeColorsLight: Record<WorkflowNodeType, any> = {
  OPERATION_NODE: { fill: '#ECECEC', stroke: '#A19F9D' },
  GRAPH_NODE: { fill: '#FFF', stroke: '#A19F9D' },
  SUBGRAPH_NODE: { fill: '#FFF', stroke: '#A19F9D' },
  SCOPE_CARD_NODE: { fill: '#1f85ff', stroke: '#1f85ff' },
  SUBGRAPH_CARD_NODE: { fill: '#486991', stroke: '#486991' },
  HIDDEN_NODE: { fill: '#00000000', stroke: '#00000000' },
  PLACEHOLDER_NODE: { fill: '#ECECEC', stroke: '#A19F9D' },
};

const nodeColorsDark: Record<WorkflowNodeType, any> = {
  OPERATION_NODE: { fill: '#323130', stroke: '#8A8886' },
  GRAPH_NODE: { fill: '#252423', stroke: '#8A8886' },
  SUBGRAPH_NODE: { fill: '#252423', stroke: '#8A8886' },
  SCOPE_CARD_NODE: { fill: '#1f85ff', stroke: '#1f85ff' },
  SUBGRAPH_CARD_NODE: { fill: '#486991', stroke: '#486991' },
  HIDDEN_NODE: { fill: '#00000000', stroke: '#00000000' },
  PLACEHOLDER_NODE: { fill: '#323130', stroke: '#8A8886' },
};

const Minimap = () => {
  const showMinimap = useShowMinimap();
  const { setCenter } = useReactFlow();
  const onClick = useCallback(
    (_event: unknown, position: XYPosition) => {
      setCenter(position.x, position.y);
    },
    [setCenter]
  );
  const { isInverted } = useTheme();
  const nodeColors = useMemo(() => (isInverted ? nodeColorsDark : nodeColorsLight), [isInverted]);

  if (!showMinimap) {
    return null;
  }

  const nodeColor = (node: any) => nodeColors[node.type as WorkflowNodeType].fill;
  const nodeStrokeColor = (node: any) => nodeColors[node.type as WorkflowNodeType].stroke;

  return (
    <MiniMap
      nodeColor={nodeColor}
      nodeStrokeColor={nodeStrokeColor}
      nodeStrokeWidth={3}
      nodeBorderRadius={0}
      pannable
      zoomable
      onClick={onClick}
    />
  );
};

export default Minimap;
