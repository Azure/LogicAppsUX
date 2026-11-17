interface Point {
  x: number;
  y: number;
}

export interface CanvasViewport {
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
}

export interface CanvasBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function constrainZoomToWidth(contentWidth: number, viewportWidth: number, requestedZoom: number): number {
  if (contentWidth <= 0 || viewportWidth <= 0) {
    return requestedZoom;
  }
  return Math.min(requestedZoom, viewportWidth / contentWidth);
}

export function getCanvasBounds(nodes: readonly Point[]) {
  let left = 0;
  let top = 0;
  let right = 0;
  let bottom = 0;
  for (const node of nodes) {
    left = Math.min(left, node.x < 40 ? node.x - 80 : 0);
    top = Math.min(top, node.y < 32 ? node.y - 80 : 0);
    right = Math.max(right, node.x + 80);
    bottom = Math.max(bottom, node.y + 80);
  }
  return { originX: -left, originY: -top, width: right - left, height: bottom - top };
}

export function fitLinkViewport(
  nodes: readonly Point[],
  origin: { originX: number; originY: number },
  width: number,
  height: number,
  current: CanvasViewport,
  maximumZoom = 1
): CanvasViewport {
  if (nodes.length === 0 || width <= 32 || height <= 64) {
    return current;
  }
  const left = Math.min(...nodes.map((node) => node.x + origin.originX - 48));
  const right = Math.max(...nodes.map((node) => node.x + origin.originX + 48));
  const top = Math.min(...nodes.map((node) => node.y + origin.originY - 40));
  const bottom = Math.max(...nodes.map((node) => node.y + origin.originY + 40));
  if (
    left * current.zoom - current.scrollLeft >= 16 &&
    right * current.zoom - current.scrollLeft <= width - 16 &&
    top * current.zoom - current.scrollTop >= 48 &&
    bottom * current.zoom - current.scrollTop <= height - 16
  ) {
    return current;
  }
  // Reserve room for the sticky zoom controls and both ends of each functoid.
  const zoom = Math.min(maximumZoom, (width - 32) / (right - left), (height - 64) / (bottom - top));
  return {
    zoom,
    scrollLeft: Math.max(0, ((left + right) * zoom) / 2 - width / 2),
    scrollTop: Math.max(0, ((top + bottom) * zoom) / 2 - (height + 32) / 2),
  };
}

export function zoomToCanvasBox(
  selection: CanvasBox,
  viewport: { width: number; height: number },
  content: { width: number; height: number },
  current: CanvasViewport,
  limits: { minimumZoom: number; maximumZoom: number },
  zoomOut = false
): CanvasViewport {
  if (selection.width < 4 || selection.height < 4 || viewport.width <= 0 || viewport.height <= 0) {
    return current;
  }
  const fitFactor = Math.min(viewport.width / selection.width, viewport.height / selection.height);
  const requestedZoom = zoomOut ? current.zoom / fitFactor : current.zoom * fitFactor;
  const zoom = Math.min(limits.maximumZoom, Math.max(limits.minimumZoom, requestedZoom));
  const centerX = (selection.x + selection.width / 2 + current.scrollLeft) / current.zoom;
  const centerY = (selection.y + selection.height / 2 + current.scrollTop) / current.zoom;
  return {
    zoom,
    scrollLeft: Math.max(0, Math.min(Math.max(0, content.width * zoom - viewport.width), centerX * zoom - viewport.width / 2)),
    scrollTop: Math.max(0, Math.min(Math.max(0, content.height * zoom - viewport.height), centerY * zoom - viewport.height / 2)),
  };
}
