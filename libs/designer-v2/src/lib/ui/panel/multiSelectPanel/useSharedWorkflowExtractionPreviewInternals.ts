import { useStore, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect, useMemo, type RefObject } from 'react';
import type { SharedExtractionPreviewNode } from './workflowExtractionPreview';

export const useSharedWorkflowExtractionPreviewInternals = (
  containerRef: RefObject<HTMLDivElement>,
  nodes: SharedExtractionPreviewNode[]
) => {
  const updateNodeInternals = useUpdateNodeInternals();
  // Use measured natural bounds, not caller estimates or transformed DOMRects.
  const measurementKey = useStore(({ nodeLookup }) =>
    JSON.stringify(
      [...nodeLookup.values()].map((node) => [
        node.id,
        node.measured.width ?? 0,
        node.measured.height ?? 0,
        !!node.internals.handleBounds?.source?.length && !!node.internals.handleBounds?.target?.length,
      ])
    )
  );
  const measurements = useMemo(
    () =>
      new Map(
        (JSON.parse(measurementKey) as [string, number, number, boolean][]).map(([id, width, height, handles]) => [
          id,
          { width, height, handles },
        ])
      ),
    [measurementKey]
  );
  const ready =
    nodes.length > 0 &&
    nodes.every(({ id }) => {
      const size = measurements.get(id);
      return !!size?.width && !!size.height && size.handles;
    });
  const nodeIdsKey = JSON.stringify(nodes.map(({ id }) => id));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) {
      return;
    }
    let disposed = false;
    let frame: number;
    const refresh = () => {
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
            frame = requestAnimationFrame(refresh);
          }
        });
      } else {
        updateNodeInternals(JSON.parse(nodeIdsKey));
      }
    };
    frame = requestAnimationFrame(refresh);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [containerRef, nodeIdsKey, ready, measurementKey, updateNodeInternals]);
  return { measurements, ready };
};
