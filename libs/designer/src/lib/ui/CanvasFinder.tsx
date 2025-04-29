import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useInternalNode, useNodes, useReactFlow } from '@xyflow/react';

import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { clearFocusCollapsedNode, clearFocusNode } from '../core/state/workflow/workflowSlice';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import type { RootState, AppDispatch } from '../core';
import { useWindowDimensions } from '@microsoft/logic-apps-shared';
import { getTargetPositionForWorkflow } from '../core/utils/designerLayoutHelpers';

export const CanvasFinder = () => {
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const isEmpty = useIsGraphEmpty();
  const { setCenter, getZoom } = useReactFlow();
  const windowDimensions = useWindowDimensions();
  const dispatch = useDispatch<AppDispatch>();

  const [firstLoad, setFirstLoad] = useState(true);

  const nodes = useNodes();
  const firstNode = useMemo(() => nodes[0], [nodes]);
  const focusNode = useInternalNode(focusNodeId ?? '');

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

      const [xTarget, yTarget] = getTargetPositionForWorkflow(firstNode, windowDimensions, DEFAULT_NODE_SIZE);
      setCenter(xTarget, yTarget, { zoom: 1 });
      setFirstLoad(false);
    }
  }, [setCenter, isEmpty, firstLoad, firstNode, windowDimensions]);

  // Center the canvas on the focused node when set
  const setCanvasCenterToFocus = useCallback(() => {
    if (!focusNode) {
      return;
    }

    const xRawPos = focusNode?.internals.positionAbsolute?.x ?? 0;
    const yRawPos = focusNode?.internals.positionAbsolute?.y ?? 0;

    const xTarget = xRawPos + (focusNode?.measured?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
    const yTarget = yRawPos + DEFAULT_NODE_SIZE.height / 2; // Center Y on node midpoint

    setCenter(xTarget, yTarget, {
      zoom: getZoom(),
      duration: 350,
    });

    dispatch(clearFocusNode());
    dispatch(clearFocusCollapsedNode());
  }, [focusNode, setCenter, getZoom, dispatch]);

  useEffect(() => {
    setCanvasCenterToFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode]);

  return null;
};
