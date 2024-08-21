import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useHoverEdge, useSelectedEdge } from '../../../../core/state/selectors/selectors';
import { colors } from '../styles';
import { useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { setHoverState } from '../../../../core/state/DataMapSlice';

const LoopEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const isSelected = useSelectedEdge(id);
  const dispatch = useDispatch();
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isHovered, isSelected]);

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

  return (
    <g id={`${id}_customEdge`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} />
    </g>
  );
};

export default LoopEdge;
