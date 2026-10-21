import { css } from '@fluentui/utilities';
import { buildSvgSpline, useGuid } from '@microsoft/logic-apps-shared';
import { useReactFlow, type EdgeProps, type XYPosition } from '@xyflow/react';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowCap } from './dynamicsvgs/arrowCap';

/** Shared native handoff spline/cap presentation. Only the live controller supplies an edit indicator. */
export const HandoffEdgeView = ({
  id,
  splinePath,
  highlighted = false,
  style,
  children,
}: {
  id: string;
  splinePath: string;
  highlighted?: boolean;
  style?: CSSProperties;
  children?: (midpoint: XYPosition) => ReactNode;
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const [geometry, setGeometry] = useState({ midpoint: { x: -999, y: -999 }, markerAngle: 0 });
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !path.getTotalLength) {
      return;
    }
    const length = path.getTotalLength();
    if (length <= 0) {
      return;
    }
    const last = path.getPointAtLength(length * 0.999);
    const previous = path.getPointAtLength(length * 0.998);
    setGeometry({
      midpoint: path.getPointAtLength(length * 0.5),
      markerAngle: Math.atan2(last.y - previous.y, last.x - previous.x) * (180 / Math.PI) - 90,
    });
  }, [splinePath]);
  const capGuid = useGuid();
  if (!id) {
    return null;
  }
  return (
    <>
      <defs>
        <marker
          id={capGuid}
          className={css('handoff', highlighted && 'highlighted')}
          viewBox="0 0 20 20"
          refX="6"
          refY="8"
          markerWidth="12"
          markerHeight="10"
          orient={geometry.markerAngle}
        >
          <ArrowCap />
        </marker>
      </defs>
      <path
        id={id}
        ref={pathRef}
        style={style}
        className={css('react-flow__edge-path', 'handoff', highlighted && 'highlighted')}
        d={splinePath}
        strokeDasharray="4 6"
        strokeLinecap="round"
        markerEnd={`url(#${capGuid})`}
      />
      {children?.(geometry.midpoint)}
    </>
  );
};

export const ReadOnlyHandoffEdge = ({ id, data, style }: EdgeProps) => {
  const { getNode } = useReactFlow();
  const elkEdge = data?.elkEdge as (ElkExtendedEdge & { container?: string }) | undefined;
  let container = elkEdge?.container ? getNode(elkEdge.container) : undefined;
  const offset = { x: 0, y: 0 };
  while (container) {
    offset.x += container.position.x;
    offset.y += container.position.y;
    container = container.parentId ? getNode(container.parentId) : undefined;
  }
  const section = elkEdge?.sections?.[0];
  if (!section) {
    return null;
  }
  const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((point) => ({
    x: point.x + offset.x,
    y: point.y + offset.y,
  }));
  return <HandoffEdgeView id={id} splinePath={buildSvgSpline(points)} style={style} />;
};
