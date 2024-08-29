import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useHoverEdge, useSelectedEdge } from '../../../../core/state/selectors/selectors';
import { colors } from '../styles';
import { useMemo } from 'react';

const LoopEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const isSelected = useSelectedEdge(id);
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isHovered, isSelected]);

  return (
    <g id={`${id}_customEdge`}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} />
    </g>
  );
};

export default LoopEdge;
