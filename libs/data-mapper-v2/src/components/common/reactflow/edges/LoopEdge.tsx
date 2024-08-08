import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useActiveEdge } from '../../../../core/state/selectors/selectors';
import { colors } from '../styles';

const LoopEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;
  const activeEdge = useActiveEdge(id);

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeColor = activeEdge ? colors.active : colors.loop;

  return (
    <g id={`${id}_customEdge`}>
      <path fill="none" stroke={strokeColor} strokeWidth={6} className="animated" d={path} />
    </g>
  );
};

export default LoopEdge;
