import { getStraightPath, type ConnectionLineComponentProps } from '@xyflow/react';
import { activeColor } from '../styles';

const ConnectionLineComponent = (props: ConnectionLineComponentProps) => {
  const { fromX, fromY, toX, toY, fromNode } = props;

  const [path] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g id={`${fromNode?.id}_customConnectionLine`}>
      <circle cx={fromX} cy={fromY} r={8} strokeWidth={2} stroke={activeColor} fill="transparent" />
      <path fill="none" stroke={activeColor} strokeWidth={6} className="animated" d={path} />
      <circle cx={toX} cy={toY} r={8} strokeWidth={2} stroke={activeColor} fill="transparent" />
    </g>
  );
};

export default ConnectionLineComponent;
