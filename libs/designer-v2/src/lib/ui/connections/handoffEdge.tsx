import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, type EdgeProps, type XYPosition } from '@xyflow/react';
import { css } from '@fluentui/utilities';
import { Button } from '@fluentui/react-components';
import { EdgePillButton, nodeLineStrokes, useNodeLineStyles } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { useIntl } from 'react-intl';
import { useConnectionStyles } from './connections.styles';
import {
  containsIdTag,
  removeIdTag,
  useEdgeIndex,
  useNodeGlobalPosition,
  buildSvgSpline,
  useEdgesData,
  useGuid,
} from '@microsoft/logic-apps-shared';

import { useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { useIsNodeSelectedInOperationPanel, useIsNodeInMultiSelection } from '../../core/state/panel/panelSelectors';
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
  isRevealed?: boolean;
  sharedPresentation?: boolean;
}

const EdgeContent = (props: EdgeContentProps) => {
  const { x, y, graphId, parentId, childId, isLeaf } = props;
  const dispatch = useDispatch<AppDispatch>();
  const enabled = useSharedNodeUi();
  const shared = props.sharedPresentation ?? enabled;
  const styles = useConnectionStyles();
  const intl = useIntl();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const label = intl.formatMessage({ defaultMessage: 'Edit handoff', id: 'O4TSC3', description: 'Text for button to edit a handoff' });

  const openMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
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
  }, [dispatch, graphId, parentId, childId, isLeaf]);
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (shared) {
        e.stopPropagation();
      }
      openMenu();
    },
    [openMenu, shared]
  );

  const buttonRef = useRef<HTMLDivElement>(null);

  return (
    <EdgeLabelRenderer>
      <div
        ref={buttonRef}
        style={{
          width: shared ? nodeMetrics.edgeControl.hitTargetSize : edgeContentWidth,
          height: shared ? nodeMetrics.edgeControl.hitTargetSize : edgeContentHeight,
          position: 'absolute',
          left: x,
          top: y,
          pointerEvents: 'all',
          zIndex: 100,
        }}
      >
        {shared ? (
          <div
            className={styles.control}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setFocused(false);
              }
            }}
          >
            <EdgePillButton
              icon={<HandoffIcon fill="currentColor" />}
              tooltip={label}
              ariaLabel={label}
              tabIndex={props.tabIndex}
              isRevealed={!!props.isRevealed || hovered || focused}
              onActivate={openMenu}
              onContextMenu={onClick}
            />
          </div>
        ) : (
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
        )}
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
  presentation?: { shared: boolean };
}

const edgeContentHeight = 24;
const edgeContentWidth = 24;

const HandoffEdge: React.FC<EdgeProps<LogicAppsEdgeProps>> = ({ id, source, target, style = {}, data }) => {
  const readOnly = useReadOnly();
  const enabled = useSharedNodeUi();
  const accepted = data as { presentation?: { shared?: boolean } } | undefined;
  const shared = accepted?.presentation?.shared ?? enabled;
  const line = useNodeLineStyles();
  const styles = useConnectionStyles();
  const [hovered, setHovered] = useState(false);

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
  // Shared frame/tool extents can change an accepted route without remounting its edge.
  const sharedRoute = shared ? splinePath : undefined;

  const tabIndex = useEdgeIndex(id);

  const isSourceSelected = useIsNodeSelectedInOperationPanel(sourceId);
  const isTargetSelected = useIsNodeSelectedInOperationPanel(targetId);
  const isSourceMultiSelected = useIsNodeInMultiSelection(sourceId);
  const isTargetMultiSelected = useIsNodeInMultiSelection(targetId);

  const selected = useMemo(
    () => isSourceSelected || isTargetSelected || isSourceMultiSelected || isTargetMultiSelected,
    [isSourceSelected, isTargetSelected, isSourceMultiSelected, isTargetMultiSelected]
  );

  const colorClass = useMemo(() => {
    if (selected) {
      return 'highlighted';
    }
    return '';
  }, [selected]);

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
    },
    [pathRef, pathReady]
  );

  const [midpoint, setMidpoint] = useState<XYPosition>({ x: -999, y: -999 });
  useEffect(() => {
    if (!pathReady || !pathRef.current) {
      return;
    }
    setMidpoint(getPointOnPath(0.5));
  }, [getPointOnPath, pathReady, pathRef, sharedRoute]);

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
  }, [getPointOnPath, pathReady, pathRef, sharedRoute]);

  const capGuid = useGuid();

  if (!id) {
    return null;
  }

  return (
    <>
      {!shared && (
        <defs>
          <marker
            id={capGuid}
            className={css('handoff', colorClass)}
            viewBox="0 0 20 20"
            refX="6"
            refY="8"
            markerWidth="12"
            markerHeight="10"
            orient={markerAngle}
          >
            <ArrowCap />
          </marker>
        </defs>
      )}

      <path
        id={id}
        ref={pathRef}
        style={shared ? { ...style, ...nodeLineStrokes.dashedNeutral } : style}
        className={
          shared ? css('msla-shared-edge-path', line.base, line.dashedNeutral) : css('react-flow__edge-path', 'handoff', colorClass)
        }
        data-line={shared ? 'dashedNeutral' : undefined}
        d={splinePath}
        strokeDasharray={shared ? undefined : '4 6'}
        strokeLinecap={'round'}
        markerEnd={shared ? undefined : `url(#${capGuid})`}
      />
      {shared && (
        <path
          d={splinePath}
          className={styles.hitPath}
          strokeWidth={nodeMetrics.edgeControl.interactionWidth}
          data-edge-hit-target
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      )}

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
          x={midpoint.x - (shared ? nodeMetrics.edgeControl.hitTargetSize : edgeContentWidth) / 2}
          y={midpoint.y - (shared ? nodeMetrics.edgeControl.hitTargetSize : edgeContentHeight) / 2}
          graphId={graphId}
          parentId={source}
          childId={target}
          tabIndex={tabIndex}
          isRevealed={hovered}
          sharedPresentation={shared}
        />
      )}
    </>
  );
};

export default memo(HandoffEdge);
