import { getStraightPath, useReactFlow, type EdgeProps } from '@xyflow/react';
import { useHoverEdge, useSelectedIntermediateEdge } from '../../../../core/state/selectors/selectors';
import { useMemo } from 'react';
import { colors } from '../styles';
import { useSelector } from 'react-redux';
import { splitEdgeId } from '../../../../utils/Edge.Utils';
import type { RootState } from '../../../../core/state/Store';
import { isSourceNode, isTargetNode, getTreeNodeId, isFunctionNode } from '../../../../utils/ReactFlow.Util';
import { flattenSchemaIntoSortArray } from '../../../../utils';
import { NodeIds } from '../../../../constants/ReactFlowConstants';

const IntermediateConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, data } = props;
  const { getInternalNode } = useReactFlow();
  const { isDueToScroll, isDueToCollapse } = data ?? {
    isDueToCollapse: undefined,
    isDueToScroll: undefined,
  };
  const splitIds = useMemo(() => splitEdgeId(id), [id]);
  const { sourceOpenKeys, targetOpenKeys, sourceSchema, targetSchema } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );

  const componentId1 = useMemo(() => ((data && data['componentId']) ?? '') as string, [data]);
  const componentId2 = useMemo(() => (splitIds.length >= 2 ? splitIds[0] : ''), [splitIds]);
  const componentId3 = useMemo(() => (splitIds.length >= 2 ? splitIds[1] : ''), [splitIds]);

  // Direction is only needed in case of Scroll
  const direction = useMemo(() => {
    const sourceHandles = getInternalNode(NodeIds.source)?.internals?.handleBounds?.source ?? [];
    const targetHandles = getInternalNode(NodeIds.target)?.internals?.handleBounds?.target ?? [];
    if (isDueToScroll && componentId1 && sourceSchema?.schemaTreeRoot && targetSchema?.schemaTreeRoot) {
      let direction = '';
      let sortArray = [];
      let firstElement = '';
      if (isSourceNode(componentId1)) {
        sortArray = flattenSchemaIntoSortArray(sourceSchema?.schemaTreeRoot);
        firstElement = sourceHandles.length > 2 ? sourceHandles[2]?.id ?? '' : '';
        direction = '-left';
      } else {
        sortArray = flattenSchemaIntoSortArray(targetSchema?.schemaTreeRoot);
        firstElement = targetHandles.length > 2 ? targetHandles[2]?.id ?? '' : '';
        direction = '-right';
      }

      const index = sortArray.findIndex((node) => node === getTreeNodeId(componentId1));
      const firstElementIndex = sortArray.findIndex((node) => node === getTreeNodeId(firstElement));

      if (index >= 0 && firstElementIndex >= 0) {
        return index > firstElementIndex ? `bottom${direction}` : `top${direction}`;
      }
    }
    return '';
  }, [getInternalNode, isDueToScroll, componentId1, sourceSchema?.schemaTreeRoot, targetSchema?.schemaTreeRoot]);

  const isSelected = useSelectedIntermediateEdge(componentId1 ?? '', componentId2 ?? '');

  // Check if both source and target nodes are visible, i.e. present in the map
  // Or if none of the nodes are present, then the edge shouldn't be visible
  const oneHandleVisible = useMemo(() => {
    if (isFunctionNode(componentId1) && isFunctionNode(componentId2)) {
      return false;
    }

    const sourceHandles = getInternalNode(NodeIds.source)?.internals?.handleBounds?.source ?? [];
    const targetHandles = getInternalNode(NodeIds.target)?.internals?.handleBounds?.target ?? [];

    // If both are function nodes, then we only show the temporary edge is the target node isn't there
    const lengthToCheck = isFunctionNode(componentId1) || isFunctionNode(componentId2) ? 0 : 1;
    return [...sourceHandles, ...targetHandles].filter((n) => n.id === componentId1 || n.id === componentId2).length === lengthToCheck;
  }, [componentId1, componentId2, getInternalNode]);

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
  if (isDueToScroll && componentId1 && oneHandleVisible && direction && componentId3.startsWith(direction as string)) {
    return edgeJSXElement;
  }

  // For collapse behavior, we need to make sure the parent is collapsed before showing the edge
  if (
    isDueToCollapse &&
    ((isSourceNode(componentId2) && isSourceNode(componentId1) && sourceOpenKeys[getTreeNodeId(componentId2)] === false) ||
      (isTargetNode(componentId3) && isTargetNode(componentId1) && targetOpenKeys[getTreeNodeId(componentId3)] === false))
  ) {
    return edgeJSXElement;
  }

  return null;
};

export default IntermediateConnectedEdge;
