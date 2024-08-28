import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useSelectedEdge, useHoverEdge } from '../../../../core/state/selectors/selectors';
import { useMemo } from 'react';
import { colors } from '../styles';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const isSelected = useSelectedEdge(id);
  const isHovered = useHoverEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (isHovered || isSelected ? colors.edgeActive : colors.edgeConnected), [isSelected, isHovered]);

  return (
    <g id={`${id}_customEdge`}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} />
    </g>
  );
};

export default ConnectedEdge;
