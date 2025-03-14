import { getStraightPath, type ConnectionLineComponentProps } from '@xyflow/react';
import { customTokens } from '../../../../core/ThemeConect';

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
      <circle cx={fromX} cy={fromY} r={8} strokeWidth={2} stroke={customTokens['edgeActive']} fill="transparent" />
      <path fill="none" stroke={customTokens['edgeActive']} strokeWidth={6} className="animated" d={path} />
      <circle cx={toX} cy={toY} r={8} strokeWidth={2} stroke={customTokens['edgeActive']} fill="transparent" />
    </g>
  );
};

export default ConnectionLineComponent;
