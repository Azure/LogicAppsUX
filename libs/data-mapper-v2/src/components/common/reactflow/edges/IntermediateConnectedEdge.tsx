import { getStraightPath, useNodes, type EdgeProps } from '@xyflow/react';
import { useHoverEdge } from '../../../../core/state/selectors/selectors';
import { useCallback, useMemo } from 'react';
import { colors } from '../styles';
import { useDispatch, useSelector } from 'react-redux';
import { setHoverState } from '../../../../core/state/DataMapSlice';
import { splitEdgeId } from '../../../../utils/Edge.Utils';
import type { RootState } from '../../../../core/state/Store';

const IntermediateConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, data } = props;
  const splitIds = useMemo(() => splitEdgeId(id), [id]);
  const nodes = useNodes();
  const { temporaryEdgeMappingDirection } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const componentId1 = useMemo(() => data && data['componentId'], [data]);
  const componentId2 = useMemo(() => (splitIds.length >= 2 ? splitIds[0] : undefined), [splitIds]);
  const componentId3 = useMemo(() => (splitIds.length >= 2 ? splitIds[1] : undefined), [splitIds]);
  const direction = useMemo(
    () => componentId1 && temporaryEdgeMappingDirection[componentId1 as string],
    [componentId1, temporaryEdgeMappingDirection]
  );

  // Check if both source and target nodes are visible, i.e. present in the map
  // Or if none of the nodes are present, then the edge shouldn't be visible
  const oneNodeVisible = useMemo(
    () => nodes.filter((node) => node.id === componentId1 || node.id === componentId2).length === 1,
    [nodes, componentId1, componentId2]
  );

  const dispatch = useDispatch();
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered ? colors.edgeActive : colors.edgeConnected), [isHovered]);

  const onMouseEnter = useCallback(() => {
    dispatch(
      setHoverState({
        id: id,
        type: 'edge',
      })
    );
  }, [dispatch, id]);

  const onMouseLeave = useCallback(() => {
    dispatch(setHoverState());
  }, [dispatch]);

  return componentId3 && componentId1 && componentId2 && oneNodeVisible && direction && componentId3.startsWith(direction as string) ? (
    <g id={`${id}_customEdge`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} />
    </g>
  ) : null;
};

export default IntermediateConnectedEdge;
