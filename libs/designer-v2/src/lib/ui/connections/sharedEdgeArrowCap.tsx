import type { CSSProperties } from 'react';
import { tokens } from '@fluentui/react-components';
import { getNodeLineArrowPath } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { NodeLineArrowDirection } from '@microsoft/designer-ui-v2/metrics';
import { Position } from '@xyflow/react';

/**
 * Designer edges are longer and denser than Otto lines, so the library's 3.18 half-extent reads as a
 * smudge at 100% zoom. The host owns this larger value; the library default stays pinned for Otto.
 */
export const SHARED_EDGE_ARROW_SIZE = 6;
/** Visible gap between the arrow tip and whatever sits at the target port (input dot or run-after chips). */
export const SHARED_EDGE_TARGET_CLEARANCE = 3;
/**
 * React Flow anchors the target at the card edge, but the visible input dot overhangs that edge by
 * `-handle.edgeOffset` on either axis. Without this inset the tip lands inside the dot.
 */
export const SHARED_EDGE_TARGET_PORT_EXTENT = -nodeMetrics.handle.edgeOffset;
/** Distance from the target port to the shared arrow tip; run-after chips replace the dot as the obstacle. */
export const getSharedTargetInset = (indicatorExtent = 0) =>
  (indicatorExtent > 0 ? indicatorExtent : SHARED_EDGE_TARGET_PORT_EXTENT) + SHARED_EDGE_TARGET_CLEARANCE;
/** Gap between the arrow chevron and the edge of a target-side insert pill. */
export const SHARED_EDGE_PILL_CAP_GAP = 2;
/**
 * Distance from the target port to a target-side insert pill centre. The legacy offset (32, or 36 with
 * run-after chips) can put the always-visible pill over the shared arrow tip once chips push the tip out,
 * hiding direction exactly where edges converge. Never move the pill closer than the legacy offset.
 */
export const getSharedTargetButtonDistance = (indicatorExtent = 0) =>
  Math.max(
    32 + (indicatorExtent > 0 ? 4 : 0),
    getSharedTargetInset(indicatorExtent) + SHARED_EDGE_ARROW_SIZE + nodeMetrics.edgeControl.pillSize / 2 + SHARED_EDGE_PILL_CAP_GAP
  );
/**
 * The neutral line token (colorNeutralStroke1) is intentionally faint so dense graphs stay calm, but a
 * 1px chevron in that colour is indistinguishable from the canvas. Direction is information, so neutral
 * caps use an accessible foreground neutral and every cap is drawn thicker than its line. Status and
 * highlight hues are already saturated and keep their colour.
 */
export const SHARED_EDGE_CAP_NEUTRAL_STROKE = tokens.colorNeutralForeground4;
export const SHARED_EDGE_CAP_STROKE_WIDTH = tokens.strokeWidthThick;

const getCapPaint = (style: CSSProperties | undefined): CSSProperties => {
  // Dashed/dimmed line opacity must not fade the direction cap, so drop it from the cap paint.
  const paint: CSSProperties = { ...style };
  delete paint.opacity;
  return {
    ...paint,
    stroke: paint.stroke === tokens.colorNeutralStroke1 ? SHARED_EDGE_CAP_NEUTRAL_STROKE : paint.stroke,
    strokeWidth: SHARED_EDGE_CAP_STROKE_WIDTH,
  };
};

/** Moves a port coordinate outward along the port normal; works for vertical and horizontal layouts. */
export const offsetFromPort = (x: number, y: number, position: Position, distance: number) => ({
  x: x + (position === Position.Left ? -distance : position === Position.Right ? distance : 0),
  y: y + (position === Position.Top ? -distance : position === Position.Bottom ? distance : 0),
});

export interface SharedEdgeArrowCapProps {
  /** Document-unique marker id; the edge stroke references it through `markerEnd`. */
  id: string;
  /** Final vertex of the referencing stroke, in the same user space as the stroke. */
  x: number;
  y: number;
  direction: NodeLineArrowDirection;
  /** Line variant echoed as `data-line-cap` for probes; omitted for transient draft lines. */
  variant?: string;
  /** Chevron half-extent; defaults to the designer edge size, not the Otto library size. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shared-presentation arrow cap rendered as an SVG marker owned by the edge stroke.
 *
 * Why a marker instead of a sibling path: the cap tip overlaps the stroke's final vertex. As a
 * separate element, hiding or restoring only the stroke repaints a dirty region that still contains
 * the cap, and the rasterizer can re-blend the overlapping anti-aliased pixels differently from the
 * original full paint. A marker is painted as part of the referencing stroke, so the stroke and its
 * cap always rasterize, hide and restore as one unit, and `.msla-shared-edge-path` stays the single
 * element that owns the edge's paint.
 *
 * Geometry: the cap keeps its absolute `getNodeLineArrowPath` coordinates and the marker
 * maps `refX`/`refY` (the endpoint) onto the stroke's final vertex in user space, with no rotation or
 * scaling. `overflow="visible"` is required because those absolute coordinates sit outside the
 * marker's nominal viewport.
 */
export const SharedEdgeArrowCap = ({
  id,
  x,
  y,
  direction,
  variant,
  size = SHARED_EDGE_ARROW_SIZE,
  className,
  style,
}: SharedEdgeArrowCapProps) => {
  // Opacity is a group effect of the referencing stroke, which already composites its marker.
  // Repeating it on the marker content would apply it twice (0.4 * 0.4 for inactive monitoring
  // edges), so only the paint properties are copied onto the cap.
  const capStyle = getCapPaint(style);
  return (
    <defs>
      <marker id={id} markerUnits="userSpaceOnUse" refX={x} refY={y} markerWidth={1} markerHeight={1} orient="0" overflow="visible">
        <path
          d={getNodeLineArrowPath(x, y, direction, size)}
          style={capStyle}
          className={className}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-line-cap={variant}
        />
      </marker>
    </defs>
  );
};
