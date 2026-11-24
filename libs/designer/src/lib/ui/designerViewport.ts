import { getViewportForBounds, type ReactFlowInstance } from '@xyflow/react';

/** Fit adopted public bounds, even while virtualization leaves some nodes unmeasured. */
export const fitDesignerViewport = (instance: ReactFlowInstance, canvas: HTMLElement) => {
  const nodes = instance.getNodes().filter((node) => !node.hidden);
  const rect = canvas.getBoundingClientRect();
  if (!nodes.length || !rect.width || !rect.height) {
    return;
  }
  let usableHeight = rect.height;
  for (const overlay of Array.from(canvas.ownerDocument.querySelectorAll<HTMLElement>('[data-designer-viewport-inset="bottom"]'))) {
    const inset = overlay.getBoundingClientRect();
    if (
      inset.width > 0 &&
      inset.height > 0 &&
      inset.right > rect.left &&
      inset.left < rect.right &&
      inset.bottom > rect.top &&
      inset.top < rect.bottom
    ) {
      usableHeight = Math.min(usableHeight, Math.max(0, inset.top - rect.top));
    }
  }
  if (!usableHeight) {
    return;
  }
  return instance.setViewport(getViewportForBounds(instance.getNodesBounds(nodes), rect.width, usableHeight, 0.05, 2, 0.1));
};
