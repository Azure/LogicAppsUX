import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, type EdgeProps, type XYPosition } from '@xyflow/react';
import { css } from '@fluentui/utilities';
import { Button } from '@fluentui/react-components';
import {
  containsIdTag,
  removeIdTag,
  useEdgeIndex,
  guid,
  useNodeGlobalPosition,
  buildSvgSpline,
  useEdgesData,
} from '@microsoft/logic-apps-shared';

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import type { AppDispatch } from '../../core';
import { HandoffIcon } from './dynamicsvgs/handoffIcon';
import { setEdgeContextMenuData } from '../../core/state/designerView/designerViewSlice';

interface EdgeContentProps {
  x: number;
  y: number;
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
}

const EdgeContent = (props: EdgeContentProps) => {
  const { x, y, graphId, parentId, childId, isLeaf } = props;
  const dispatch = useDispatch<AppDispatch>();

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      e.preventDefault();
      dispatch(
        setEdgeContextMenuData({
          graphId,
          parentId,
          childId,
          isLeaf,
          location: {
            x: (rect?.left ?? 0) + (rect?.width ?? 0),
            y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
          },
          isHandoff: true,
        })
      );
    },
    [dispatch, graphId, parentId, childId, isLeaf]
  );

  const buttonRef = useRef<HTMLDivElement>(null);

  return (
    <EdgeLabelRenderer>
      <div
        ref={buttonRef}
        style={{
          width: edgeContentWidth,
          height: edgeContentHeight,
          position: 'absolute',
          left: x,
          top: y,
          pointerEvents: 'all',
          zIndex: 100,
        }}
      >
        <Button
          icon={<HandoffIcon />}
          appearance="primary"
          size="small"
          shape="circular"
          onClick={onClick}
          onContextMenu={onClick}
          style={
            {
              '--colorBrandBackground': '#3352b9',
              '--colorBrandBackgroundHover': '#1438ae',
              '--colorBrandBackgroundPressed': '#0f2d8b',
            } as any
          }
        />
      </div>
    </EdgeLabelRenderer>
  );
};

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

const edgeContentHeight = 24;
const edgeContentWidth = 24;

const HandoffEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({ id, source, target, style = {} }) => {
  const readOnly = useReadOnly();

  const nodeMetadata = useNodeMetadata(source);
  const sourceId = containsIdTag(source) ? removeIdTag(source) : source;
  const targetId = containsIdTag(target) ? removeIdTag(target) : target;
  const graphId = (containsIdTag(source) ? removeIdTag(source) : undefined) ?? nodeMetadata?.graphId ?? '';

  const edgeData = useEdgesData(id);

  const containerId = useMemo(() => (edgeData?.data?.elkEdge as any)?.container, [edgeData?.data?.elkEdge]);
  const rootOffset = useNodeGlobalPosition(containerId);

  // Combine all points into a single array
  const splinePoints: { x: number; y: number }[] = useMemo(() => {
    const section = (edgeData?.data?.elkEdge as any)?.sections?.[0];
    return [section?.startPoint, ...(section?.bendPoints ?? []), section?.endPoint].map((point: XYPosition) => ({
      x: point.x + rootOffset.x,
      y: point.y + rootOffset.y,
    }));
  }, [edgeData?.data?.elkEdge, rootOffset.x, rootOffset.y]);

  // Create an SVG path string
  const splinePath = useMemo(() => buildSvgSpline(splinePoints), [splinePoints]);

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);

  const selected = useMemo(() => isSourceSelected || isTargetSelected, [isSourceSelected, isTargetSelected]);

  const colorClass = useMemo(() => {
    if (selected) {
      return 'highlighted';
    }
    return '';
  }, [selected]);

  const markerId = useMemo(() => `arrow-end-${guid()}`, []);

  const pathRef = useRef<SVGPathElement>(null);

  const [pathReady, setPathReady] = useState(false);
  useEffect(() => {
    if (pathRef.current) {
      setPathReady(true);
    }
  }, [pathRef]);

  const getPointOnPath = useCallback(
    (percent: number) => {
      if (pathReady && !!pathRef.current) {
        const totalLength = pathRef.current.getTotalLength();
        if (totalLength > 0) {
          return pathRef.current.getPointAtLength(totalLength * percent);
        }
      }
      return { x: 0, y: 0 };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [pathRef, pathReady]
  );

  const [midpoint, setMidpoint] = useState<XYPosition>({ x: -999, y: -999 });
  useEffect(() => {
    if (!pathReady || !pathRef.current) {
      return;
    }
    setMidpoint(getPointOnPath(0.5));
  }, [getPointOnPath, pathReady, pathRef]);

  const [markerAngle, setMarkerAngle] = useState(0);
  useEffect(() => {
    if (!pathReady || !pathRef.current) {
      return;
    }
    const lastPoint = getPointOnPath(0.999);
    const secondLastPoint = getPointOnPath(0.998);
    const dx = lastPoint.x - secondLastPoint.x;
    const dy = lastPoint.y - secondLastPoint.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    setMarkerAngle(angle - 90);
  }, [getPointOnPath, pathReady, pathRef]);

  if (!id) {
    return null;
  }

  return (
    <>
      <defs>
        <marker
          id={markerId}
          className={css('handoff', colorClass)}
          viewBox="0 0 20 20"
          refX="6"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          orient={markerAngle}
        >
          <ArrowCap />
        </marker>
      </defs>

      <path
        id={id}
        ref={pathRef}
        style={style}
        className={css('react-flow__edge-path', 'handoff', colorClass)}
        d={splinePath}
        strokeDasharray={'4 6'}
        strokeLinecap={'round'}
        markerEnd={`url(#${markerId})`}
      />

      {/* KEEP: This is for edge id testing */}
      {/* <text x={midpoint.x} y={midpoint.y} fontSize="10" fill="black">
				= {id}
			</text> */}

      {/* KEEP: This is for spline development testing */}
      {/* {splinePoints.map((point, index) => (
				<>
					<text x={point.x} y={point.y} fontSize="10" fill="black">{index} - {id}</text>
					<circle
						key={index}
						cx={point.x}
						cy={point.y}
						r={2}
						className={css('react-flow__edge-path', 'transition', colorClass)}
						style={{
							stroke: 'var(--colorNeutralStroke2)',
							fill: 'var(--colorNeutralStroke2)',
						}}
					/>
				</>
			))} */}

      {/* Handoff Indicator */}
      {readOnly ? null : (
        <EdgeContent
          x={midpoint.x - edgeContentWidth / 2}
          y={midpoint.y - edgeContentHeight / 2}
          graphId={graphId}
          parentId={source}
          childId={target}
          tabIndex={tabIndex}
        />
      )}
    </>
  );
};

export default memo(HandoffEdge);
