import { useSyncExternalStore } from 'react';

let settled = false;
let scheduled = false;
const listeners = new Set<() => void>();

const settle = () => {
  settled = true;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!settled && !scheduled) {
    scheduled = true;
    // React Flow mounts every node once before culling to the viewport, so non-essential per-node UI waits
    // until that bulk mount and the first paint have finished.
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(settle, { timeout: 500 });
    } else {
      setTimeout(settle, 0);
    }
  }
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => settled;

/** Returns false until the designer's initial bulk node mount has settled, then true for the rest of the session. */
export const useInitialMountSettled = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
