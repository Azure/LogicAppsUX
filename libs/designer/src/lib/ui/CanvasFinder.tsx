import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useInternalNode, useNodes, useReactFlow } from '@xyflow/react';

import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { clearFocusNode } from '../core/state/workflow/workflowSlice';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import type { RootState, AppDispatch } from '../core';

export const CanvasFinder = () => {
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const isEmpty = useIsGraphEmpty();
  const { setCenter, getZoom } = useReactFlow();
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

      const xTarget = (firstNode?.position?.x ?? 0) + (firstNode?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
      setCenter(xTarget, 150, { zoom: 1 });
      setFirstLoad(false);
    }
  }, [setCenter, isEmpty, firstLoad, firstNode]);

  // Center the canvas on the focused node when set
  const setCanvasCenterToFocus = useCallback(() => {
    if (!focusNode) {
      return;
    }

    const xRawPos = focusNode?.internals.positionAbsolute?.x ?? 0;
    const yRawPos = focusNode?.internals.positionAbsolute?.y ?? 0;

    const xTarget = xRawPos + (focusNode?.measured?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
    const yTarget = yRawPos + (focusNode?.measured?.height ?? DEFAULT_NODE_SIZE.height); // Center Y on bottom edge

    setCenter(xTarget, yTarget, {
      zoom: getZoom(),
      duration: 500,
    });

    dispatch(clearFocusNode());
  }, [focusNode, setCenter, getZoom, dispatch]);

  useEffect(() => {
    setCanvasCenterToFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode]);

  return null;
};
