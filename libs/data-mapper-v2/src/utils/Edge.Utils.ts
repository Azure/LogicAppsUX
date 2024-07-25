import { LogCategory, LogService } from './Logging.Utils';
import * as PF from 'pathfinding';
import type { Node as ReactFlowNode, XYPosition } from '@xyflow/react';
import { Position } from '@xyflow/react';

interface BoundingBox {
  width: number;
  height: number;
  topLeft: XYPosition;
  bottomLeft: XYPosition;
  topRight: XYPosition;
  bottomRight: XYPosition;
}

interface NodeBoundingBox extends BoundingBox {
  id: string;
}

interface GraphBoundingBox extends BoundingBox {
  xMax: number;
  yMax: number;
  xMin: number;
  yMin: number;
}

interface GetSmoothStepEdgeParams {
  nodes: ReactFlowNode[];
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  borderRadius?: number;
  pfGridSize?: number;
  nodePadding?: number;
  edgeBendOffsetRatio?: number;
}

const getLinearDistance = (a: XYPosition, b: XYPosition) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

// Theoretically more efficient getLinearDistance for midpoint calculations
const getLineStretchLength = (a: XYPosition, b: XYPosition) => (a.x === b.x ? Math.abs(a.y - b.y) : Math.abs(a.x - b.x));

const getQuadraticCurve = (a: XYPosition, b: XYPosition, c: XYPosition, borderRadius: number): string => {
  const bendSize = Math.min(getLinearDistance(a, b) / 2, getLinearDistance(b, c) / 2, borderRadius);
  const { x: midX, y: midY } = b;

  // No bend - straight line
  if ((a.x === midX && midX === c.x) || (a.y === midY && midY === c.y)) {
    return `L${midX} ${midY}`;
  }

  // Horizontal stretch going into a vertical stretch
  if (a.y === midY) {
    const xDir = a.x < c.x ? -1 : 1;
    const yDir = a.y < c.y ? 1 : -1;
    return `L ${midX + bendSize * xDir},${midY}Q ${midX},${midY} ${midX},${midY + bendSize * yDir}`;
  }

  // Vertical stretch going into a horizontal stretch
  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${midX},${midY + bendSize * yDir}Q ${midX},${midY} ${midX + bendSize * xDir},${midY}`;
};

const getNextPointFromPosition = (curPoint: XYPosition, position: Position): XYPosition => {
  switch (position) {
    case Position.Top:
      return { x: curPoint.x, y: curPoint.y - 1 };
    case Position.Bottom:
      return { x: curPoint.x, y: curPoint.y + 1 };
    case Position.Left:
      return { x: curPoint.x - 1, y: curPoint.y };
    case Position.Right:
      return { x: curPoint.x + 1, y: curPoint.y };
  }
};

const guaranteeWalkablePath = (grid: PF.Grid, curPoint: XYPosition, position: Position) => {
  let node = grid.getNodeAt(curPoint.x, curPoint.y);

  while (!node.walkable) {
    grid.setWalkableAt(node.x, node.y, true);
    const next = getNextPointFromPosition(node, position);
    node = grid.getNodeAt(next.x, next.y);
  }
};

const generateBoundingBoxes = (nodes: ReactFlowNode[], nodePadding = 2, roundTo = 2) => {
  let xMax = Number.MIN_SAFE_INTEGER;
  let yMax = Number.MIN_SAFE_INTEGER;
  let xMin = Number.MAX_SAFE_INTEGER;
  let yMin = Number.MAX_SAFE_INTEGER;

  const nodeBoxes: NodeBoundingBox[] = nodes.map((node) => {
    const width = Math.max(node.width || 0, 1);
    const height = Math.max(node.height || 0, 1);

    const position: XYPosition = {
      x: node.position?.x || 0,
      y: node.position?.y || 0,
    };

    const topLeft: XYPosition = {
      x: position.x - nodePadding,
      y: position.y - nodePadding,
    };
    const bottomLeft: XYPosition = {
      x: position.x - nodePadding,
      y: position.y + height + nodePadding,
    };
    const topRight: XYPosition = {
      x: position.x + width + nodePadding,
      y: position.y - nodePadding,
    };
    const bottomRight: XYPosition = {
      x: position.x + width + nodePadding,
      y: position.y + height + nodePadding,
    };

    if (roundTo > 0) {
      topLeft.x = Math.floor(topLeft.x / roundTo) * roundTo;
      topLeft.y = Math.floor(topLeft.y / roundTo) * roundTo;
      bottomLeft.x = Math.floor(bottomLeft.x / roundTo) * roundTo;
      bottomLeft.y = Math.ceil(bottomLeft.y / roundTo) * roundTo;
      topRight.x = Math.ceil(topRight.x / roundTo) * roundTo;
      topRight.y = Math.floor(topRight.y / roundTo) * roundTo;
      bottomRight.x = Math.ceil(bottomRight.x / roundTo) * roundTo;
      bottomRight.y = Math.ceil(bottomRight.y / roundTo) * roundTo;
    }

    if (topLeft.y < yMin) {
      yMin = topLeft.y;
    }
    if (topLeft.x < xMin) {
      xMin = topLeft.x;
    }
    if (bottomRight.y > yMax) {
      yMax = bottomRight.y;
    }
    if (bottomRight.x > xMax) {
      xMax = bottomRight.x;
    }

    return {
      id: node.id,
      width,
      height,
      topLeft,
      bottomLeft,
      topRight,
      bottomRight,
    };
  });

  const graphPadding = nodePadding * 2;

  xMax = Math.ceil((xMax + graphPadding) / roundTo) * roundTo;
  yMax = Math.ceil((yMax + graphPadding) / roundTo) * roundTo;
  xMin = Math.floor((xMin - graphPadding) / roundTo) * roundTo;
  yMin = Math.floor((yMin - graphPadding) / roundTo) * roundTo;

  const topLeft: XYPosition = {
    x: xMin,
    y: yMin,
  };

  const bottomLeft: XYPosition = {
    x: xMin,
    y: yMax,
  };

  const topRight: XYPosition = {
    x: xMax,
    y: yMin,
  };

  const bottomRight: XYPosition = {
    x: xMax,
    y: yMax,
  };

  const width = Math.abs(topLeft.x - topRight.x);
  const height = Math.abs(topLeft.y - bottomLeft.y);

  const graphBox: GraphBoundingBox = {
    topLeft,
    bottomLeft,
    topRight,
    bottomRight,
    width,
    height,
    xMax,
    yMax,
    xMin,
    yMin,
  };

  return { graphBox, nodeBoxes };
};

const convertCanvasToGridPoint = (canvasPoint: XYPosition, smallestX: number, smallestY: number, gridSize: number): XYPosition => {
  let x = canvasPoint.x / gridSize;
  let y = canvasPoint.y / gridSize;

  let referenceX = smallestX / gridSize;
  let referenceY = smallestY / gridSize;

  if (referenceX < 1) {
    while (referenceX !== 1) {
      referenceX++;
      x++;
    }
  } else if (referenceX > 1) {
    while (referenceX !== 1) {
      referenceX--;
      x--;
    }
  }

  if (referenceY < 1) {
    while (referenceY !== 1) {
      referenceY++;
      y++;
    }
  } else if (referenceY > 1) {
    while (referenceY !== 1) {
      referenceY--;
      y--;
    }
  }

  return { x, y };
};

const convertGridToCanvasPoint = (gridPoint: XYPosition, smallestX: number, smallestY: number, gridSize: number): XYPosition => {
  let x = gridPoint.x * gridSize;
  let y = gridPoint.y * gridSize;

  let referenceX = smallestX;
  let referenceY = smallestY;

  if (referenceX < gridSize) {
    while (referenceX !== gridSize) {
      referenceX = referenceX + gridSize;
      x = x - gridSize;
    }
  } else if (referenceX > gridSize) {
    while (referenceX !== gridSize) {
      referenceX = referenceX - gridSize;
      x = x + gridSize;
    }
  }

  if (referenceY < gridSize) {
    while (referenceY !== gridSize) {
      referenceY = referenceY + gridSize;
      y = y - gridSize;
    }
  } else if (referenceY > gridSize) {
    while (referenceY !== gridSize) {
      referenceY = referenceY - gridSize;
      y = y + gridSize;
    }
  }

  return { x, y };
};

const generatePathfindingGrid = (
  graph: GraphBoundingBox,
  nodes: NodeBoundingBox[],
  sourceCoords: XYPosition,
  sourcePos: Position,
  targetCoords: XYPosition,
  targetPos: Position,
  gridSize: number
) => {
  const { xMin, yMin, width, height } = graph;

  // Create a grid representation of the canvas (w/ squares of edge size gridSize)
  const mapColumns = Math.ceil(width / gridSize) + 1;
  const mapRows = Math.ceil(height / gridSize) + 1;

  const grid = new PF.Grid(mapColumns, mapRows);

  // Set grid squares occupied by nodes to be non-walkable
  nodes.forEach((node) => {
    const nodeStart = convertCanvasToGridPoint(node.topLeft, xMin, yMin, gridSize);
    const nodeEnd = convertCanvasToGridPoint(node.bottomRight, xMin, yMin, gridSize);

    for (let x = nodeStart.x; x < nodeEnd.x; x++) {
      for (let y = nodeStart.y; y < nodeEnd.y; y++) {
        grid.setWalkableAt(x, y, false);
      }
    }
  });

  // Convert the starting and ending graph points to grid points
  const startGrid = convertCanvasToGridPoint(
    {
      x: Math.round(sourceCoords.x / gridSize) * gridSize,
      y: Math.round(sourceCoords.y / gridSize) * gridSize,
    },
    xMin,
    yMin,
    gridSize
  );

  const endGrid = convertCanvasToGridPoint(
    {
      x: Math.round(targetCoords.x / gridSize) * gridSize,
      y: Math.round(targetCoords.y / gridSize) * gridSize,
    },
    xMin,
    yMin,
    gridSize
  );

  const startingNode = grid.getNodeAt(startGrid.x, startGrid.y);
  guaranteeWalkablePath(grid, startingNode, sourcePos);
  const endingNode = grid.getNodeAt(endGrid.x, endGrid.y);
  guaranteeWalkablePath(grid, endingNode, targetPos);

  // Start at points offset from the node edges
  const start = getNextPointFromPosition(startingNode, sourcePos);
  const end = getNextPointFromPosition(endingNode, targetPos);

  return { grid, start, end };
};

const findPath = (grid: PF.Grid, start: XYPosition, end: XYPosition): number[][] => {
  const pathfinder = PF.JumpPointFinder({ diagonalMovement: PF.DiagonalMovement.Never });

  const path = pathfinder.findPath(start.x, start.y, end.x, end.y, grid);

  if (path.length === 0) {
    LogService.error(LogCategory.EdgeUtils, 'findPath', {
      message: `Unable to find path between (${start.x}, ${start.y}) and (${end.x}, ${end.y}) - using simple path instead`,
    });

    const simplePathStart = [start.x, start.y];
    const simplePathMid = [(start.x + end.x) / 2, (start.y + end.y) / 2];
    const simplePathEnd = [end.x, end.y];
    return [simplePathStart, simplePathMid, simplePathEnd];
  }

  return path;
};

export const getSmoothStepEdge = ({
  nodes,
  sourceX,
  sourceY,
  sourcePosition = Position.Right,
  targetX,
  targetY,
  targetPosition = Position.Left,
  borderRadius = 5,
  pfGridSize = 10,
  nodePadding = 10,
  edgeBendOffsetRatio = 15,
}: GetSmoothStepEdgeParams): [svgPath: string, labelX: number, labelY: number] => {
  // Pathfinding: Generate grid from ReactFlow nodes, then use that to find a path
  const { graphBox, nodeBoxes } = generateBoundingBoxes(nodes, nodePadding, pfGridSize);
  const { grid, start, end } = generatePathfindingGrid(
    graphBox,
    nodeBoxes,
    { x: sourceX, y: sourceY },
    sourcePosition,
    { x: targetX, y: targetY },
    targetPosition,
    pfGridSize
  );
  const pathfindingPath = PF.Util.compressPath(findPath(grid, start, end));

  // Convert pathfinding coordinates back to ReactFlow canvas coordinates
  const canvasPath = pathfindingPath.map((point) =>
    convertGridToCanvasPoint({ x: point[0], y: point[1] }, graphBox.xMin, graphBox.yMin, pfGridSize)
  );

  const firstPointYPos = canvasPath[0].y;
  const lastPointYPos = canvasPath[canvasPath.length - 1].y;
  const edgeBendOffset = sourceY / edgeBendOffsetRatio; // Edge offset based on sourceY
  const longestEdgeInfo = {
    edgeStartIdx: 0,
    length: getLineStretchLength(canvasPath[0], canvasPath[1]),
  };

  canvasPath.forEach((point, idx) => {
    // Set first and last point yPos's (and any other points that share them) to the source and target yPos's
    if (idx === 0) {
      canvasPath[idx].y = sourceY;
    } else if (point.y === firstPointYPos) {
      canvasPath[idx].y = sourceY;
    } else if (point.y === lastPointYPos) {
      canvasPath[idx].y = targetY;
    } else {
      // Offset horizontal bendPoint-line-stretches
      canvasPath[idx].y += 2 * (edgeBendOffset / 10);
    }

    // Marginally offset vertical bendPoint-line-stretches
    if (idx === canvasPath.length - 1) {
      canvasPath[idx].x -= edgeBendOffset / 2;
      canvasPath[idx].y = targetY; // Carryover from setting yPos for last point
    } else {
      canvasPath[idx].x += edgeBendOffset;
    }

    // Keep track of longest line stretch to use for midpoint (labelX/Y)
    if (idx > 1) {
      const prevPoint = canvasPath[idx - 1];
      const curPoint = canvasPath[idx];
      const curLength = getLineStretchLength(prevPoint, curPoint);

      if (curLength > longestEdgeInfo.length) {
        longestEdgeInfo.edgeStartIdx = idx - 1;
        longestEdgeInfo.length = curLength;
      }
    }
  });

  // Check that paths with only two points are in fact straight lines, otherwise fix it
  // *Pathfinder's use of grid means that extremely close yPos's are seen as "on the same level"
  // - meaning it doesn't generate a bend point, which results in a diagonal line
  if (canvasPath.length === 2 && sourceY !== targetY) {
    const midX = Math.abs(canvasPath[0].x + canvasPath[1].x) / 2;
    const midY = Math.abs(canvasPath[0].y + canvasPath[1].y) / 2;

    // Have to add these points so the quadratic curves form properly
    canvasPath.splice(1, 0, { x: midX, y: sourceY });
    canvasPath.splice(2, 0, { x: midX, y: midY });
    canvasPath.splice(3, 0, { x: midX, y: targetY });
  }

  const midPoint: XYPosition = {
    x: Math.abs(canvasPath[longestEdgeInfo.edgeStartIdx].x + canvasPath[longestEdgeInfo.edgeStartIdx + 1].x) / 2,
    y: Math.abs(canvasPath[longestEdgeInfo.edgeStartIdx].y + canvasPath[longestEdgeInfo.edgeStartIdx + 1].y) / 2,
  };

  // Finally, add in handle points
  canvasPath.splice(0, 0, { x: sourceX, y: sourceY });
  canvasPath.push({ x: targetX, y: targetY });

  // Generate SVG path from pathfinding result
  const svgPath = canvasPath.reduce<string>((resultPath, curPoint, idx) => {
    let segment = '';

    if (idx > 0 && idx < canvasPath.length - 1) {
      segment = getQuadraticCurve(canvasPath[idx - 1], curPoint, canvasPath[idx + 1], borderRadius);
    } else {
      segment = `${idx === 0 ? 'M' : 'L'}${curPoint.x} ${curPoint.y}`;
    }

    return resultPath + segment;
  }, '');

  return [svgPath, midPoint.x, midPoint.y];
};
