import { getBezierPath, type EdgeProps } from 'reactflow';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props;
  const [edgePath, _labelX, _labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return <path id={id} fill="none" strokeWidth={6} className="animated" stroke="#C6DEEE" d={edgePath} markerEnd={markerEnd} />;
};

export default ConnectedEdge;
