import { getStraightPath, type EdgeProps } from 'reactflow';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY } = props;

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <g id={`${id}_customEdge`}>
      <path fill="none" stroke="#C6DEEE" strokeWidth={6} className="animated" d={path} />
    </g>
  );
};

export default ConnectedEdge;
