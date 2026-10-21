import type React from 'react';
import { memo, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { EdgeLabelRenderer, type EdgeProps, type XYPosition } from '@xyflow/react';
import { Button } from '@fluentui/react-components';
import {
  containsIdTag,
  removeIdTag,
  useEdgeIndex,
  useNodeGlobalPosition,
  buildSvgSpline,
  useEdgesData,
} from '@microsoft/logic-apps-shared';

import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { HandoffEdgeView } from './handoffEdgeView';
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
  const isSourceMultiSelected = useIsNodeInMultiSelection(sourceId);
  const isTargetMultiSelected = useIsNodeInMultiSelection(targetId);

  const selected = useMemo(
    () => isSourceSelected || isTargetSelected || isSourceMultiSelected || isTargetMultiSelected,
    [isSourceSelected, isTargetSelected, isSourceMultiSelected, isTargetMultiSelected]
  );

  return (
    <HandoffEdgeView id={id} style={style} splinePath={splinePath} highlighted={selected}>
      {(midpoint) =>
        readOnly ? null : (
          <EdgeContent
            x={midpoint.x - edgeContentWidth / 2}
            y={midpoint.y - edgeContentHeight / 2}
            graphId={graphId}
            parentId={source}
            childId={target}
            tabIndex={tabIndex}
          />
        )
      }
    </HandoffEdgeView>
  );
};

export default memo(HandoffEdge);
