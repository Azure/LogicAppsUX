import React, { memo } from 'react';
import { EdgeSmoothStepProps, EdgeText, Position, getMarkerEnd, getEdgeCenter } from 'react-flow-renderer';

// These are some helper methods for drawing the round corners
// The name indicates the direction of the path. "bottomLeftCorner" goes
// from bottom to the left and "leftBottomCorner" goes from left to the bottom.
// We have to consider the direction of the paths because of the animated lines.
const bottomLeftCorner = (x: number, y: number, size: number): string => `L ${x},${y - size}Q ${x},${y} ${x + size},${y}`;
const leftBottomCorner = (x: number, y: number, size: number): string => `L ${x + size},${y}Q ${x},${y} ${x},${y - size}`;
const bottomRightCorner = (x: number, y: number, size: number): string => `L ${x},${y - size}Q ${x},${y} ${x - size},${y}`;
const rightBottomCorner = (x: number, y: number, size: number): string => `L ${x - size},${y}Q ${x},${y} ${x},${y - size}`;
const leftTopCorner = (x: number, y: number, size: number): string => `L ${x + size},${y}Q ${x},${y} ${x},${y + size}`;
const topLeftCorner = (x: number, y: number, size: number): string => `L ${x},${y + size}Q ${x},${y} ${x + size},${y}`;
const topRightCorner = (x: number, y: number, size: number): string => `L ${x},${y + size}Q ${x},${y} ${x - size},${y}`;
const rightTopCorner = (x: number, y: number, size: number): string => `L ${x - size},${y}Q ${x},${y} ${x},${y + size}`;

interface GetSmoothStepPathParams {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  borderRadius?: number;
  centerX?: number;
  centerY?: number;
}

export function getSmoothStepPath({
  sourceX,
  sourceY,
  sourcePosition = Position.Bottom,
  targetX,
  targetY,
  targetPosition = Position.Top,
  borderRadius = 5,
  centerX,
  centerY,
}: GetSmoothStepPathParams): string {
  const [_centerX, _centerY, offsetX, offsetY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY });
  const cornerWidth = Math.min(borderRadius, Math.abs(targetX - sourceX));
  const cornerHeight = Math.min(borderRadius, Math.abs(targetY - sourceY));
  const cornerSize = Math.min(cornerWidth, cornerHeight, offsetX, offsetY);
  const leftAndRight = [Position.Left, Position.Right];
  const cX = typeof centerX !== 'undefined' ? centerX : _centerX;
  const cY = (typeof centerY !== 'undefined' ? centerY : _centerY) - 50;

  console.log(targetY-sourceY);

  let firstCornerPath = null;
  let secondCornerPath = null;

  if (sourceX <= targetX) {
    firstCornerPath = sourceY <= targetY ? bottomLeftCorner(sourceX, cY+30, cornerSize) : topLeftCorner(sourceX, cY-30, cornerSize);
    secondCornerPath = sourceY <= targetY ? rightTopCorner(targetX, cY+60, cornerSize) : rightBottomCorner(targetX, cY+30, cornerSize);
  } else {
    firstCornerPath = sourceY < targetY ? bottomRightCorner(sourceX, cY+30, cornerSize) : topRightCorner(sourceX, cY-30, cornerSize);
    secondCornerPath = sourceY < targetY ? leftTopCorner(targetX, cY+60, cornerSize) : leftBottomCorner(targetX, cY+30, cornerSize);
  }

  if (leftAndRight.includes(sourcePosition) && leftAndRight.includes(targetPosition)) {
    if (sourceX <= targetX) {
      firstCornerPath = sourceY <= targetY ? rightTopCorner(cX, sourceY, cornerSize) : rightBottomCorner(cX, sourceY, cornerSize);
      secondCornerPath = sourceY <= targetY ? bottomLeftCorner(cX, targetY, cornerSize) : topLeftCorner(cX, targetY, cornerSize);
    } else if (sourcePosition === Position.Right && targetPosition === Position.Left) {
      // and sourceX > targetX
      firstCornerPath = sourceY <= targetY ? leftTopCorner(cX, sourceY, cornerSize) : leftBottomCorner(cX, sourceY, cornerSize);
      secondCornerPath = sourceY <= targetY ? bottomRightCorner(cX, targetY, cornerSize) : topRightCorner(cX, targetY, cornerSize);
    }
  } else if (leftAndRight.includes(sourcePosition) && !leftAndRight.includes(targetPosition)) {
    if (sourceX <= targetX) {
      firstCornerPath = sourceY <= targetY ? rightTopCorner(targetX, sourceY, cornerSize) : rightBottomCorner(targetX, sourceY, cornerSize);
    } else {
      firstCornerPath = sourceY <= targetY ? leftTopCorner(targetX, sourceY, cornerSize) : leftBottomCorner(targetX, sourceY, cornerSize);
    }
    secondCornerPath = '';
  } else if (!leftAndRight.includes(sourcePosition) && leftAndRight.includes(targetPosition)) {
    if (sourceX <= targetX) {
      firstCornerPath = sourceY <= targetY ? bottomLeftCorner(sourceX, targetY, cornerSize) : topLeftCorner(sourceX, targetY, cornerSize);
    } else {
      firstCornerPath = sourceY <= targetY ? bottomRightCorner(sourceX, targetY, cornerSize) : topRightCorner(sourceX, targetY, cornerSize);
    }
    secondCornerPath = '';
  }

  return `M ${sourceX},${sourceY}${firstCornerPath}${secondCornerPath}L ${targetX},${targetY}`;
}

export const CustomConnectionLine = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    style,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    arrowHeadType,
    markerEndId,
    borderRadius = 0,
  }: EdgeSmoothStepProps) => {
    const [centerX, centerY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

    console.log(label);
    const path = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius,
      centerY: centerY,
    });

    const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);

    const text = label ? (
      <EdgeText
        x={centerX}
        y={centerY}
        label={label}
        labelStyle={labelStyle}
        labelShowBg={labelShowBg}
        labelBgStyle={labelBgStyle}
        labelBgPadding={labelBgPadding}
        labelBgBorderRadius={labelBgBorderRadius}
      />
    ) : null;

    return (
      <>
        <path
          d={path}
          markerEnd={markerEnd}
          pointerEvents="visibleStroke"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="#8A8886"
          style={{}}
          strokeWidth="2"></path>
        {text}
      </>
    );
  }
);
