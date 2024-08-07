import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useActiveEdge } from '../../../core/state/selectors/selectors';
import { useMemo } from 'react';
import { colors } from './styles';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const activeEdge = useActiveEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = useMemo(() => (activeEdge ? colors.active : colors.connected), [activeEdge]);

  return (
    <g id={`${id}_customEdge`}>
      <path fill="none" stroke={strokeColor} strokeWidth={6} className="animated" d={path} />
    </g>
  );
};

export default ConnectedEdge;
