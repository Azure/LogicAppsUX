import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useSelectedEdge, useHoverEdge } from '../../../../core/state/selectors/selectors';
import { useCallback, useMemo } from 'react';
import { colors } from '../styles';
import { useDispatch } from 'react-redux';
import { setHoverState } from '../../../../core/state/DataMapSlice';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const dispatch = useDispatch();
  const isSelected = useSelectedEdge(id);
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isSelected, isHovered]);

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

export default ConnectedEdge;
