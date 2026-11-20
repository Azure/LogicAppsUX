import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useInternalNode, useNodes, useReactFlow } from '@xyflow/react';

import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { clearFocusCollapsedNode, clearFocusNode } from '../core/state/workflow/workflowSlice';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import type { RootState, AppDispatch } from '../core';
import { removeIdTag, useWindowDimensions, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getTargetPositionForWorkflow } from '../core/utils/designerLayoutHelpers';

export const CanvasFinder = () => {
  const focusNodeId = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const expandedActionId = useSelector((state: RootState) => state.workflow.focusExpandedActionId);
  const isEmpty = useIsGraphEmpty();
  const { setCenter, getZoom } = useReactFlow();
  const windowDimensions = useWindowDimensions();
  const dispatch = useDispatch<AppDispatch>();

  const [firstLoad, setFirstLoad] = useState(true);

  const nodes = useNodes();
  const firstNode = useMemo(() => nodes[0], [nodes]);
  // The retired summary and expanded operation can have the same ID while ELK is still running.
  const expandedCard = expandedActionId
    ? nodes.find(
        ({ id, type }) =>
          (type === WORKFLOW_NODE_TYPES.OPERATION_NODE && id === expandedActionId) ||
          (type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE && removeIdTag(id) === expandedActionId)
      )
    : undefined;
  const focusNode = useInternalNode((expandedActionId ? expandedCard?.id : focusNodeId) ?? '');

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
      return undefined;
    }

    const xRawPos = focusNode?.internals.positionAbsolute?.x ?? 0;
    const yRawPos = focusNode?.internals.positionAbsolute?.y ?? 0;

    const xTarget = xRawPos + (focusNode?.measured?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
    const clampedHeight = Math.min(windowDimensions.height * 0.4, focusNode?.measured?.height ?? DEFAULT_NODE_SIZE.height);
    const yTarget = yRawPos + clampedHeight / 2; // Center Y on node midpoint

    return setCenter(xTarget, yTarget, {
      zoom: getZoom(),
      duration: 350,
    });
  }, [focusNode, windowDimensions.height, setCenter, getZoom]);

  useEffect(() => {
    const centering = setCanvasCenterToFocus();
    if (!centering) {
      return;
    }
    if (!expandedActionId) {
      dispatch(clearFocusNode());
      dispatch(clearFocusCollapsedNode());
      return;
    }
    // Keep the focus flag while panning so a restored card outside the viewport can mount and receive it.
    let active = true;
    centering.then(() => {
      if (active) {
        dispatch(clearFocusNode());
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode, expandedActionId]);

  return null;
};
