import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, type EdgeProps, type XYPosition } from '@xyflow/react';
import { css } from '@fluentui/utilities';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import {
  containsIdTag,
  removeIdTag,
  RUN_AFTER_STATUS,
  useEdgeIndex,
  guid,
  useNodeGlobalPosition,
  buildSvgSpline,
  useEdgesData,
} from '@microsoft/logic-apps-shared';

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useActionMetadata, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from './dropzone';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { RunAfterIndicator } from './runAfterIndicator';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { removeEdgeFromRunAfterOperation } from '../../core/actions/bjsworkflow/runafter';
import { EdgePathContextMenu, useContextMenu } from './edgePathContextMenu';
import type { AppDispatch } from '../../core';

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

const runAfterWidth = 48;
const runAfterHeight = 12;

const BezierEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({ id, source, target, style = {} }) => {
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const operationData = useActionMetadata(target) as LogicAppsV2.ActionDefinition;

  const nodeMetadata = useNodeMetadata(source);
  const sourceId = containsIdTag(source) ? removeIdTag(source) : source;
  const targetId = containsIdTag(target) ? removeIdTag(target) : target;
  const graphId = (containsIdTag(source) ? removeIdTag(source) : undefined) ?? nodeMetadata?.graphId ?? '';

  const filteredRunAfters: Record<string, string[]> = useMemo(
    () =>
      Object.entries(operationData?.runAfter ?? {}).reduce((pv: Record<string, string[]>, [id, cv]) => {
        if ((cv ?? []).some((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED)) {
          pv[id] = cv;
        }

        return pv;
      }, {}),
    [operationData?.runAfter]
  );

  const runAfterStatuses = useMemo(() => filteredRunAfters?.[source] ?? [], [filteredRunAfters, source]);
  const runAfterCount = Object.keys(filteredRunAfters).length;
  const showRunAfter = runAfterStatuses.length && runAfterCount < 6;

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

  const firstPoint = useMemo(() => splinePoints[0] || { x: 0, y: 0 }, [splinePoints]);
  const lastPoint = useMemo(() => splinePoints[splinePoints.length - 1] || { x: 0, y: 0 }, [splinePoints]);
  const isInverted = useMemo(() => {
    // If first point is below last point
    return firstPoint.y > lastPoint.y;
  }, [firstPoint, lastPoint]);

  const statusPosition = useMemo(() => {
    const statusX = firstPoint.x - runAfterWidth / 2;
    let statusY = firstPoint.y - runAfterHeight;
    if (!isInverted) {
      statusY += runAfterHeight;
    }
    return { x: statusX, y: statusY };
  }, [firstPoint.x, firstPoint.y, isInverted]);

  // Create an SVG path string
  const splinePath = useMemo(() => buildSvgSpline(splinePoints), [splinePoints]);

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);

  const contextMenu = useContextMenu();
  const contextSelected = useMemo(() => contextMenu.isShowing, [contextMenu.isShowing]);

  const selected = useMemo(
    () => isSourceSelected || isTargetSelected || contextSelected,
    [isSourceSelected, isTargetSelected, contextSelected]
  );

  const deleteEdge = useCallback(() => {
    dispatch(
      removeEdgeFromRunAfterOperation({
        parentOperationId: sourceId,
        childOperationId: targetId,
      })
    );
  }, [dispatch, sourceId, targetId]);

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
      console.warn('#> ButtonEdge: Path not ready or ref not set');
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
          className={colorClass}
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
        className={css('react-flow__edge-path', colorClass)}
        d={splinePath}
        strokeDasharray={showRunAfter ? '4' : '0'}
        markerEnd={`url(#${markerId})`}
        onClick={contextMenu.handle}
        onContextMenu={contextMenu.handle}
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

      {contextMenu.isShowing && (
        <EdgePathContextMenu
          contextMenuLocation={contextMenu.location}
          open={contextMenu.isShowing}
          setOpen={contextMenu.setIsShowing}
          onDelete={deleteEdge}
        />
      )}

      {/* ADD ACTION / BRANCH BUTTONS */}
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

      {/* RUN AFTER INDICATOR */}
      {showRunAfter ? (
        <foreignObject
          id="msla-run-after-traffic-light"
          width={runAfterWidth}
          height={runAfterHeight}
          x={statusPosition.x}
          y={statusPosition.y}
        >
          <RunAfterIndicator statuses={runAfterStatuses} sourceNodeId={source} />
        </foreignObject>
      ) : null}
    </>
  );
};

export default memo(BezierEdge);
