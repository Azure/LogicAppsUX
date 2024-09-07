import { getStraightPath, useNodes, type EdgeProps } from '@xyflow/react';
import { useHoverEdge, useSelectedIntermediateEdge } from '../../../../core/state/selectors/selectors';
import { useMemo } from 'react';
import { colors } from '../styles';
import { useSelector } from 'react-redux';
import { splitEdgeId } from '../../../../utils/Edge.Utils';
import type { RootState } from '../../../../core/state/Store';
import { isSourceNode, isTargetNode, getTreeNodeId } from '../../../../utils/ReactFlow.Util';

const IntermediateConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, data } = props;
  const { isDueToScroll, isDueToCollapse } = data ?? {
    isDueToCollapse: undefined,
    isDueToScroll: undefined,
  };
  const splitIds = useMemo(() => splitEdgeId(id), [id]);
  const nodes = useNodes();
  const { intermediateEdgeMappingDirectionForScrolling, sourceOpenKeys, targetOpenKeys } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );

  const componentId1 = useMemo(() => ((data && data['componentId']) ?? '') as string, [data]);
  const componentId2 = useMemo(() => (splitIds.length >= 2 ? splitIds[0] : ''), [splitIds]);
  const componentId3 = useMemo(() => (splitIds.length >= 2 ? splitIds[1] : ''), [splitIds]);

  // Direction is only needed in case of Scroll
  const direction = useMemo(
    () => (isDueToScroll && componentId1 ? intermediateEdgeMappingDirectionForScrolling[componentId1 as string] : ''),
    [isDueToScroll, componentId1, intermediateEdgeMappingDirectionForScrolling]
  );

  const isSelected = useSelectedIntermediateEdge(componentId1 ?? '', componentId2 ?? '');

  // Check if both source and target nodes are visible, i.e. present in the map
  // Or if none of the nodes are present, then the edge shouldn't be visible
  const oneNodeVisible = useMemo(
    () => nodes.filter((node) => node.id === componentId1 || node.id === componentId2).length === 1,
    [nodes, componentId1, componentId2]
  );

  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isHovered, isSelected]);

  const edgeJSXElement = useMemo(
    () => (
      <g id={`${id}_customEdge`}>
        <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} />
      </g>
    ),
    [id, path, strokeColor]
  );

  // Id of Intermediate edge is always in the format <source-id>__edge__<target-id>__edge__<guid>
  // component2 -> source-id, component3 -> target-id
  if (!componentId2 || !componentId3) {
    return null;
  }

  // For scroll behavior, we need to make sure the dummy node[top/bottom, left/right] for which this edge is created exists,
  // and make sure we show the correct direction per which direction the node is scrolled into (up or down)
  if (isDueToScroll && componentId1 && oneNodeVisible && direction && componentId3.startsWith(direction as string)) {
    return edgeJSXElement;
  }

  // For collapse behavior, we need to make sure the parent is collapsed before showing the edge
  if (
    isDueToCollapse &&
    ((isSourceNode(componentId2) && sourceOpenKeys[getTreeNodeId(componentId2)] === false) ||
      (isTargetNode(componentId3) && targetOpenKeys[getTreeNodeId(componentId3)] === false))
  ) {
    return edgeJSXElement;
  }

  return null;
};

export default IntermediateConnectedEdge;
