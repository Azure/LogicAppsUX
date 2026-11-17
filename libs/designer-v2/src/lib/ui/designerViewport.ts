import { getViewportForBounds, type ReactFlowInstance, type Rect } from '@xyflow/react';

export const DESIGNER_MIN_ZOOM = 0.05;

/** Fit actual accepted root padding/terminals and notes inside the host's usable canvas. */
export const fitSharedDesignerViewport = (instance: ReactFlowInstance, canvas: HTMLElement, flowSize: readonly number[]) => {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  const nodeBounds = instance.getNodesBounds(instance.getNodes());
  const x = Math.min(0, nodeBounds.x);
  const y = Math.min(0, nodeBounds.y);
  const bounds = {
    x,
    y,
    width: Math.max(flowSize[0] ?? 0, nodeBounds.x + nodeBounds.width) - x,
    height: Math.max(flowSize[1] ?? 0, nodeBounds.y + nodeBounds.height) - y,
  };
  return fitBoundsInUsableViewport(instance, canvas, bounds);
};

/** Native fitting must include culled nodes and avoid the same registered host overlays as shared fitting. */
export const fitNativeDesignerViewport = (instance: ReactFlowInstance, canvas: HTMLElement) => {
  const nodes = instance.getNodes().filter((node) => !node.hidden);
  if (!nodes.length) {
    return;
  }
  return fitBoundsInUsableViewport(instance, canvas, instance.getNodesBounds(nodes));
};

const fitBoundsInUsableViewport = (instance: ReactFlowInstance, canvas: HTMLElement, bounds: Rect) => {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  let usableHeight = rect.height;
  // Hosts opt in their real overlay elements; do not couple the designer to host class names or offsets.
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
  return instance.setViewport(getViewportForBounds(bounds, rect.width, usableHeight, DESIGNER_MIN_ZOOM, 2, 0.1));
};
