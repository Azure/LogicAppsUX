import { getStraightPath, BaseEdge, EdgeLabelRenderer, type ConnectionLineComponentProps } from 'reactflow';

const ConnectionLineComponent = (props: ConnectionLineComponentProps) => {
  const { fromX, fromY, toX, toY, fromNode } = props;

  const [path, labelX, labelY] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <>
      <BaseEdge id={`${fromNode?.id}_custom_connectionLine`} path={path} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: '#ffcc00',
            padding: 10,
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
          className="nodrag nopan"
        >
          {'+'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ConnectionLineComponent;
