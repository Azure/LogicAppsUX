import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useSelectedEdge, useHoverEdge } from '../../../../core/state/selectors/selectors';
import { useCallback, useMemo } from 'react';
import { colors } from '../styles';
import { useDispatch } from 'react-redux';
import { setSelectedItem } from '../../../../core/state/DataMapSlice';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, source } = props;
  const isSelected = useSelectedEdge(id);
  const dispatch = useDispatch();
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isSelected, isHovered]);

  const onClick = useCallback(() => {
    if (source) {
      dispatch(setSelectedItem(source));
    }
  }, [dispatch, source]);

  return (
    <g id={`${id}_customEdge`} onClick={onClick} data-selectableid={id}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} data-selectableid={id} />
    </g>
  );
};

export default ConnectedEdge;
