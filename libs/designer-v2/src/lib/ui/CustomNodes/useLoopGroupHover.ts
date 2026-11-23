import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

const groupBody = '[data-loop-group-body]';
const groupHeader = '[data-loop-group-header]';

function findLoopGroup(root: HTMLElement, target: Element, x: number, y: number) {
  const headerId = target.closest(groupHeader)?.getAttribute('data-loop-group-header');
  const groups = root.querySelectorAll<HTMLElement>(groupBody);
  if (headerId !== undefined) {
    return Array.from(groups).find((group) => group.dataset.loopGroupBody === headerId);
  }
  // React Flow renders children as siblings of the frame. Test the mounted frames in reverse graph
  // order so a nested loop owns its own body; never add a hit target over the pane or its controls.
  return Array.from(groups)
    .reverse()
    .find((group) => {
      const { left, right, top, bottom } = group.getBoundingClientRect();
      return x >= left && x <= right && y >= top && y <= bottom;
    });
}

export function useLoopGroupHover(enabled: boolean) {
  const active = useRef<Element[]>([]);
  const clear = useCallback(() => {
    active.current.forEach((element) => element.removeAttribute('data-loop-active'));
    active.current = [];
  }, []);
  useEffect(() => clear, [enabled, clear]);
  const move = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const { currentTarget, target, clientX, clientY, buttons, pointerType } = event;
      const ownerWindow = currentTarget.ownerDocument.defaultView;
      if (
        buttons ||
        pointerType === 'touch' ||
        !ownerWindow ||
        !(target instanceof ownerWindow.Element) ||
        !currentTarget.contains(target) ||
        !target.closest('.react-flow__pane')
      ) {
        clear();
        return;
      }
      const body = findLoopGroup(currentTarget, target, clientX, clientY);
      if (body && active.current[0] === body && active.current[1]?.isConnected) {
        return;
      }
      clear();
      if (body) {
        const header = Array.from(currentTarget.querySelectorAll<HTMLElement>(groupHeader)).find(
          (element) => element.dataset.loopGroupHeader === body.dataset.loopGroupBody
        );
        active.current = header ? [body, header] : [body];
        active.current.forEach((element) => element.setAttribute('data-loop-active', ''));
      }
    },
    [clear]
  );
  return enabled ? { onPointerMoveCapture: move, onPointerLeave: clear, onPointerCancel: clear } : undefined;
}
