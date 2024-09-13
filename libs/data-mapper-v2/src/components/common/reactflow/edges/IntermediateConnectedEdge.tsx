import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useHoverEdge, useSelectedIntermediateEdge } from '../../../../core/state/selectors/selectors';
import { useMemo } from 'react';
import { colors } from '../styles';
import { splitEdgeId } from '../../../../utils/Edge.Utils';
import IntermediateConnectedEdgeForScrolling from './IntermediateConnectedEdgeForScrolling';
import IntermediateConnectedEdgeForCollapsing from './IntermediateConnectedEdgeForCollapsing';

const IntermediateConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, data } = props;
  const { isDueToScroll, isDueToCollapse } = data ?? {
    isDueToCollapse: undefined,
    isDueToScroll: undefined,
  };
  const splitIds = useMemo(() => splitEdgeId(id), [id]);
  const componentId1 = useMemo(() => ((data && data['componentId']) ?? '') as string, [data]);
  const componentId2 = useMemo(() => (splitIds.length >= 2 ? splitIds[0] : ''), [splitIds]);
  const componentId3 = useMemo(() => (splitIds.length >= 2 ? splitIds[1] : ''), [splitIds]);

  const isHovered = useHoverEdge(id);
  const isSelected = useSelectedIntermediateEdge(componentId1 ?? '', componentId2 ?? '');
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
  if (!componentId1 || !componentId2 || !componentId3) {
    return null;
  }

  // For scroll behavior, we need to make sure the dummy node[top/bottom, left/right] for which this edge is created exists,
  // and make sure we show the correct direction per which direction the node is scrolled into (up or down)
  if (isDueToScroll) {
    return (
      <IntermediateConnectedEdgeForScrolling edgeId={id} id1={componentId1} id2={componentId2} id3={componentId3} jsx={edgeJSXElement} />
    );
  }

  // For collapse behavior, we need to make sure the parent is collapsed before showing the edge
  if (isDueToCollapse) {
    return (
      <IntermediateConnectedEdgeForCollapsing edgeId={id} id1={componentId1} id2={componentId2} id3={componentId3} jsx={edgeJSXElement} />
    );
  }

  return null;
};

export default IntermediateConnectedEdge;
