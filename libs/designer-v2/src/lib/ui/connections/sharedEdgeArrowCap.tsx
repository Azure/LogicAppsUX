import type { CSSProperties } from 'react';
import { getNodeLineArrowPath } from '@microsoft/designer-ui-v2';
import type { NodeLineArrowDirection } from '@microsoft/designer-ui-v2/metrics';

export interface SharedEdgeArrowCapProps {
  /** Document-unique marker id; the edge stroke references it through `markerEnd`. */
  id: string;
  /** Final vertex of the referencing stroke, in the same user space as the stroke. */
  x: number;
  y: number;
  direction: NodeLineArrowDirection;
  /** Line variant echoed as `data-line-cap` for probes; omitted for transient draft lines. */
  variant?: string;
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
 * Geometry is unchanged: the cap keeps its absolute `getNodeLineArrowPath` coordinates and the marker
 * maps `refX`/`refY` (the endpoint) onto the stroke's final vertex in user space, with no rotation or
 * scaling. `overflow="visible"` is required because those absolute coordinates sit outside the
 * marker's nominal viewport.
 */
export const SharedEdgeArrowCap = ({ id, x, y, direction, variant, className, style }: SharedEdgeArrowCapProps) => {
  // Opacity is a group effect of the referencing stroke, which already composites its marker.
  // Repeating it on the marker content would apply it twice (0.4 * 0.4 for inactive monitoring
  // edges), so only the paint properties are copied onto the cap.
  const capStyle: CSSProperties = { ...style };
  delete capStyle.opacity;
  return (
    <defs>
      <marker id={id} markerUnits="userSpaceOnUse" refX={x} refY={y} markerWidth={1} markerHeight={1} orient="0" overflow="visible">
        <path
          d={getNodeLineArrowPath(x, y, direction)}
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
