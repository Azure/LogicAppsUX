/** Room left at the top of the designer surface for the Workflow / Code / Run history switcher. */
export const PAYLOAD_POPOVER_TOP_CLEARANCE = 48;

const MINIMUM_POPOVER_HEIGHT = 160;

function clipsContent(style: CSSStyleDeclaration): boolean {
  return style.overflowY === 'hidden' || style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'hidden';
}

/**
 * The run-payload popover is anchored to the bottom run button and grows upward.
 * The view switcher hangs over the top of the same surface, so the popover height
 * has to stop below that switcher instead of painting underneath it.
 */
export function findPayloadPopoverSurface(anchor: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = anchor.parentElement;
  let positionedFallback: HTMLElement | null = null;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (clipsContent(style) && node.clientHeight > MINIMUM_POPOVER_HEIGHT) {
      return node;
    }
    if ((style.position === 'relative' || style.position === 'absolute') && node.clientHeight > MINIMUM_POPOVER_HEIGHT) {
      positionedFallback = node;
    }
    node = node.parentElement;
  }

  return positionedFallback;
}

export function getPayloadPopoverMaxHeight(
  anchor: HTMLElement | null,
  clearance: number = PAYLOAD_POPOVER_TOP_CLEARANCE
): number | undefined {
  if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
    return undefined;
  }

  const surface = findPayloadPopoverSurface(anchor);
  if (!surface) {
    return undefined;
  }

  const available = anchor.getBoundingClientRect().top - surface.getBoundingClientRect().top - clearance;
  if (!Number.isFinite(available) || available < MINIMUM_POPOVER_HEIGHT) {
    return undefined;
  }

  return Math.floor(available);
}
