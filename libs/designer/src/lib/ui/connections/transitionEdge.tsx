import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import {
  useActionMetadata,
  useIsInfiniteLoop,
  useNodeMetadata,
  useTransitionRepetitionArray,
  useTransitionRepetitionIndex,
} from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import {
  containsIdTag,
  removeIdTag,
  RUN_AFTER_STATUS,
  useEdgeIndex,
  useEdgesData,
  useNodeGlobalPosition,
} from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { XYPosition, EdgeProps } from '@xyflow/react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { css } from '@fluentui/utilities';
import { TransitionStatusesIndicator } from './transitionStatuses';
// eslint-disable-next-line import/no-named-as-default
import LoopbackEdgeContent from './loopbackEdgeContent';

interface EdgeContentProps {
  x: number;
  y: number;
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  tabIndex?: number;
}

const EdgeContent = (props: EdgeContentProps) => (
  <EdgeLabelRenderer>
    <div
      style={{
        width: edgeContentWidth,
        height: edgeContentHeight,
        position: 'absolute',
        left: props.x,
        top: props.y,
        pointerEvents: 'all',
        zIndex: 100,
      }}
    >
      <DropZone graphId={props.graphId} parentId={props.parentId} childId={props.childId} isLeaf={props.isLeaf} tabIndex={props.tabIndex} />
    </div>
  </EdgeLabelRenderer>
);

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

const edgeContentHeight = 24;
const edgeContentWidth = 24;

const transitionWidth = 48;
const transitionHeight = 12;

const TransitionEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({ id, source, target, style = {} }) => {
  const readOnly = useReadOnly();
  const operationData = useActionMetadata(source) as LogicAppsV2.ActionDefinition;
  const sourceMetadata = useNodeMetadata(source);
  const targetMetadata = useNodeMetadata(target);
  const sourceId = containsIdTag(source) ? removeIdTag(source) : source;
  const targetId = containsIdTag(target) ? removeIdTag(target) : target;
  const graphId = (containsIdTag(source) ? removeIdTag(source) : undefined) ?? sourceMetadata?.graphId ?? '';
  const parentNodeId = targetMetadata?.parentNodeId ?? '';

  const isInfiniteLoop = useIsInfiniteLoop(source, target);

  const edgeData = useEdgesData(id);

  const siblingTransitions = useMemo(() => operationData?.transitions ?? {}, [operationData]);

  const transition = useMemo(() => siblingTransitions?.[target], [siblingTransitions, target]);
  const transitionStatuses = useMemo(() => transition?.when ?? [], [transition]);

  const isNonStandardTransition = useMemo(
    () => transitionStatuses.some((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED),
    [transitionStatuses]
  );
  const showStatuses = isNonStandardTransition;
  const showCondition = !!transition?.condition;

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

  const firstPoint = useMemo(() => splinePoints[0] || { x: 0, y: 0 }, [splinePoints]);
  const lastPoint = useMemo(() => splinePoints[splinePoints.length - 1] || { x: 0, y: 0 }, [splinePoints]);
  const isInverted = useMemo(() => {
    // If first point is below last point
    return firstPoint.y > lastPoint.y;
  }, [firstPoint, lastPoint]);

  // Create an SVG path string
  const splinePath = useMemo(() => buildSvgSpline(splinePoints), [splinePoints]);

  const statusPosition = useMemo(() => {
    const statusX = firstPoint.x - transitionWidth / 2;
    let statusY = firstPoint.y - transitionHeight;
    if (!isInverted) {
      statusY += transitionHeight;
    }
    return { x: statusX, y: statusY };
  }, [firstPoint.x, firstPoint.y, isInverted]);

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);
  const selected = useMemo(() => isSourceSelected || isTargetSelected, [isSourceSelected, isTargetSelected]);

  const transitionRepetitionIndex = useTransitionRepetitionIndex();
  const transitionRepetitionArray = useTransitionRepetitionArray();

  const insideNodeInCurrentTransition = useMemo(() => {
    return (transitionRepetitionArray?.[transitionRepetitionIndex] ?? []).includes(parentNodeId);
  }, [parentNodeId, transitionRepetitionArray, transitionRepetitionIndex]);

  const isNextTransition = useMemo(
    () =>
      (transitionRepetitionArray?.[transitionRepetitionIndex + 1] ?? []).includes(targetId) &&
      (transitionRepetitionArray?.[transitionRepetitionIndex] ?? []).includes(sourceId),
    [sourceId, targetId, transitionRepetitionArray, transitionRepetitionIndex]
  );
  const isPreviousTransition = useMemo(
    () =>
      (transitionRepetitionArray?.[transitionRepetitionIndex - 1] ?? []).includes(sourceId) &&
      (transitionRepetitionArray?.[transitionRepetitionIndex] ?? []).includes(targetId),
    [sourceId, targetId, transitionRepetitionArray, transitionRepetitionIndex]
  );

  const dimmed = useMemo(() => {
    if (!readOnly) {
      return false;
    }
    if (insideNodeInCurrentTransition) {
      return false;
    }
    return !isNextTransition && !isPreviousTransition;
  }, [isNextTransition, isPreviousTransition, readOnly, insideNodeInCurrentTransition]);

  const colorClass = useMemo(() => {
    if (dimmed) {
      return 'dimmed';
    }
    if (readOnly) {
      if (isNextTransition) {
        return 'nextTransition';
      }
      if (isPreviousTransition) {
        return 'previousTransition';
      }
    }
    if (selected) {
      return 'highlighted';
    }
    return '';
  }, [dimmed, isNextTransition, isPreviousTransition, readOnly, selected]);

  const markerId = useMemo(() => {
    // encode markerId as base64 to avoid issues with special characters
    return btoa(`arrow-end-${id}`);
  }, [id]);

  const pathRef = useRef<SVGPathElement>(null);
  const [pathReady, setPathReady] = useState(false);
  useEffect(() => {
    if (pathRef.current) {
      setPathReady(true);
    }
  }, [splinePath]);

  const getPointOnPath = useCallback(
    (percent: number) => {
      if (pathReady && !!pathRef.current) {
        const totalLength = pathRef.current.getTotalLength();
        return pathRef.current.getPointAtLength(totalLength * percent);
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
    const lastPoint = getPointOnPath(0.99);
    const secondLastPoint = getPointOnPath(0.98);
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
          className={css('transition', colorClass, isInfiniteLoop ? 'infinite-loop' : '')}
          viewBox="0 0 20 20"
          refX="6"
          refY="6"
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
        className={css('react-flow__edge-path', 'transition', colorClass, isInfiniteLoop ? 'infinite-loop' : '')}
        d={splinePath}
        strokeDasharray={isNonStandardTransition ? '4' : '0'}
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

      {!readOnly &&
        (isInfiniteLoop || showCondition ? (
          // LOOPBACK CONFIG BUTTON
          <LoopbackEdgeContent
            x={midpoint.x}
            y={midpoint.y}
            graphId={graphId}
            parentId={source}
            childId={target}
            tabIndex={tabIndex}
            isInfinite={isInfiniteLoop}
          />
        ) : (
          // ADD ACTION / BRANCH BUTTONS
          <EdgeContent
            x={midpoint.x - edgeContentWidth / 2}
            y={midpoint.y - edgeContentHeight / 2}
            graphId={graphId}
            parentId={source}
            childId={target}
            tabIndex={tabIndex}
          />
        ))}

      {/* STATUS INDICATOR */}
      {showStatuses ? (
        <foreignObject
          id="msla-run-after-traffic-light"
          width={transitionWidth}
          height={transitionHeight}
          x={statusPosition.x}
          y={statusPosition.y}
        >
          <TransitionStatusesIndicator transition={transition} sourceId={source} targetId={target} />
        </foreignObject>
      ) : null}
    </>
  );
};

export default memo(TransitionEdge);

function buildSvgSpline(points: XYPosition[]): string {
  if (points.length < 4 || (points.length - 1) % 3 !== 0) {
    console.warn('Invalid point structure for Bézier spline.');
    return '';
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i += 3) {
    const c1 = points[i];
    const c2 = points[i + 1];
    const end = points[i + 2];
    d += ` C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
  }
  return d;
}
