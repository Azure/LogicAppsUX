import { PanelLocation } from '@microsoft/designer-ui';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNodes, useReactFlow } from '@xyflow/react';

import { useIsPanelCollapsed } from '../core/state/panel/panelSelectors';
import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { clearFocusNode } from '../core/state/workflow/workflowSlice';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import type { RootState, AppDispatch } from '../core';

export interface CanvasFinderProps {
  panelLocation: PanelLocation;
}

export const CanvasFinder = (props: CanvasFinderProps) => {
  const { panelLocation } = props;
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const isEmpty = useIsGraphEmpty();
  const { setCenter, getZoom } = useReactFlow();
  const dispatch = useDispatch<AppDispatch>();

  const isPanelCollapsed = useIsPanelCollapsed();
  const [firstLoad, setFirstLoad] = useState(true);

  const nodes = useNodes();
  const focusNode = useMemo(() => nodes.find((node) => node.id === focusNodeId), [focusNodeId, nodes]);
  const firstNode = useMemo(() => nodes[0], [nodes]);

  // Center the canvas on the first node when the workflow is first loaded
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    if (isEmpty) {
      // If first load is an empty workflow, set canvas to center
      setCenter(DEFAULT_NODE_SIZE.width / 2, DEFAULT_NODE_SIZE.height, { zoom: 1 });
      setFirstLoad(false);
    } else {
      // Wait for useLayout to finish and return us the first node data
      if (!firstNode) {
        return;
      }

      const xTarget = (firstNode?.position?.x ?? 0) + (firstNode?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
      setCenter(xTarget, 150, { zoom: 1 });
      setFirstLoad(false);
    }
  }, [setCenter, isEmpty, firstLoad, firstNode]);

  // Center the canvas on the focused node when set
  const setCanvasCenterToFocus = useCallback(() => {
    if ((!focusNode?.position?.x && !focusNode?.position?.y) || !focusNode?.width || !focusNode?.height) {
      return;
    }

    let xRawPos = focusNode?.position?.x ?? 0;
    const yRawPos = focusNode?.position?.y ?? 0;

    // If the panel is open, reduce X space
    if (!isPanelCollapsed) {
      // Move center to the right if Panel is located to the left; otherwise move center to the left.
      const directionMultiplier = panelLocation === PanelLocation.Left ? -1 : 1;
      xRawPos += (directionMultiplier * 630) / 2 / getZoom();
    }

    const xTarget = xRawPos + (focusNode?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
    const yTarget = yRawPos + (focusNode?.height ?? DEFAULT_NODE_SIZE.height); // Center Y on bottom edge

    setCenter(xTarget, yTarget, {
      zoom: getZoom(),
      duration: 500,
    });

    dispatch(clearFocusNode());
  }, [isPanelCollapsed, dispatch, focusNode, panelLocation, setCenter, getZoom]);

  useEffect(() => {
    setCanvasCenterToFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode]);

  return null;
};
