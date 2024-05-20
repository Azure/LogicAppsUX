import { internalsSymbol, useNodes, type ConnectionLineComponentProps, type XYPosition, type HandleElement } from 'reactflow';

type Bounds = {
  id: string;
  positionAbsolute: XYPosition;
  bounds: HandleElement;
};

export default (props: ConnectionLineComponentProps) => {
  const { fromNode, toX, toY } = props;
  const handleBounds: Bounds[] = useNodes().flatMap((node) => {
    if (fromNode && node.id !== fromNode.id && !node.selected) {
      return [];
    }

    // we only want to draw a connection line from a source handle
    if (!node[internalsSymbol]?.handleBounds?.source) {
      return [];
    }

    return node[internalsSymbol].handleBounds.source.map((bounds) => ({
      id: node.id,
      positionAbsolute: node.positionAbsolute ?? { x: 0, y: 0 },
      bounds,
    }));
  });

  return handleBounds
    ? handleBounds.map(({ id, positionAbsolute, bounds }) => {
        const fromHandleX = bounds.x + bounds.width / 2;
        const fromHandleY = bounds.y + bounds.height / 2;
        const fromX = positionAbsolute.x + fromHandleX;
        const fromY = positionAbsolute.y + fromHandleY;

        return (
          <g key={`${id}-${bounds.id}`}>
            <path
              fill="none"
              strokeWidth={6}
              className="animated"
              stroke="#62AAD8"
              d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
            />
            <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="#62AAD8" strokeWidth={8} />
          </g>
        );
      })
    : undefined;
};
