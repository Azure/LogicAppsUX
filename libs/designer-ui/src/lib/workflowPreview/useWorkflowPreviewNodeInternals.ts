import { useStore, useUpdateNodeInternals } from '@xyflow/react';
import type { ReactFlowState } from '@xyflow/react';
import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { WorkflowPreviewNode } from './types';

const arePreviewNodesMeasured = ({ nodeLookup }: ReactFlowState) => {
  if (!nodeLookup.size) {
    return false;
  }
  for (const node of nodeLookup.values()) {
    if (!node.hidden && (!node.measured.width || !node.measured.height || !node.internals.handleBounds)) {
      return false;
    }
  }
  return true;
};

export const useWorkflowPreviewNodeInternals = (containerRef: RefObject<HTMLDivElement>, nodes: WorkflowPreviewNode[]) => {
  const updateNodeInternals = useUpdateNodeInternals();
  // useNodesInitialized checks caller-owned dimensions, which intentionally omit natural card heights.
  const nodesMeasured = useStore(arePreviewNodesMeasured);
  const nodeIdsKey = JSON.stringify(nodes.map(({ id }) => id));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !nodesMeasured || nodeIdsKey === '[]') {
      return;
    }

    let disposed = false;
    let frame: number;
    const updateAfterAnimations = () => {
      if (disposed) {
        return;
      }

      const animations = new Set<Animation>();
      for (let ancestor: Element | null = container; ancestor; ancestor = ancestor.parentElement) {
        for (const animation of ancestor.getAnimations?.() ?? []) {
          if (
            (animation.playState === 'running' || animation.pending) &&
            animation.effect?.getComputedTiming().endTime !== Number.POSITIVE_INFINITY
          ) {
            animations.add(animation);
          }
        }
      }

      if (animations.size) {
        Promise.allSettled([...animations].map((animation) => animation.finished)).then(() => {
          if (!disposed) {
            // Cancellation can replace an entrance animation; check again before measuring.
            frame = requestAnimationFrame(updateAfterAnimations);
          }
        });
      } else {
        updateNodeInternals(JSON.parse(nodeIdsKey));
      }
    };

    // Ancestor transforms affect handle DOMRects without triggering the node ResizeObserver.
    frame = requestAnimationFrame(updateAfterAnimations);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [containerRef, nodeIdsKey, nodesMeasured, updateNodeInternals]);

  return nodesMeasured;
};
