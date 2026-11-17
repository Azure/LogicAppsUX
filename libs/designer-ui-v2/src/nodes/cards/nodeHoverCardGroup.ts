import { createContext, useContext } from 'react';

/**
 * Internal (not exported from any barrel): coordinates the hover cards of one `DesignerUiScope`
 * so that at most one card is open per designer surface. Otto used a module-level singleton;
 * LAUX can host several designers (and iframes) on a page, so ownership is per scope and an
 * unscoped card deliberately gets no coordinator at all (context default is null).
 *
 * The group owns no timers. Cards keep their own owner-window timers and only report
 * transitions here, so a stale callback can never mutate another card's slot.
 */
export interface NodeHoverCardGroup {
  /** Card started its open delay. Cancels a different pending card; never closes the open one. */
  prepare(owner: symbol, cancelPending: () => void): void;
  /** Open delay elapsed. Succeeds only for the current pending owner, then closes the previous open card. */
  claim(owner: symbol, closeOpen: () => void): boolean;
  /** Clears the pending slot only if `owner` holds it. */
  cancel(owner: symbol): void;
  /** Clears the opened slot only if `owner` holds it. */
  release(owner: symbol): void;
}

interface Slot {
  owner: symbol;
  callback: () => void;
}

export const createNodeHoverCardGroup = (): NodeHoverCardGroup => {
  let pending: Slot | undefined;
  let opened: Slot | undefined;
  return {
    prepare(owner, cancelPending) {
      if (pending?.owner === owner) {
        // Same card re-preparing: keep its slot (and deadline), only refresh the callback.
        pending.callback = cancelPending;
        return;
      }
      const previous = pending;
      pending = { owner, callback: cancelPending };
      // Replace before notifying so a reentrant cancel() from the old card cannot clear the new slot.
      previous?.callback();
    },
    claim(owner, closeOpen) {
      if (pending?.owner !== owner) {
        // A stale timer from a card that was superseded or cancelled.
        return false;
      }
      pending = undefined;
      const previous = opened;
      // Install ownership first: the previous card's close path calls release(), which must be a no-op now.
      opened = { owner, callback: closeOpen };
      if (previous && previous.owner !== owner) {
        previous.callback();
      }
      return true;
    },
    cancel(owner) {
      if (pending?.owner === owner) {
        pending = undefined;
      }
    },
    release(owner) {
      if (opened?.owner === owner) {
        opened = undefined;
      }
    },
  };
};

export const NodeHoverCardGroupContext = createContext<NodeHoverCardGroup | null>(null);

export const useNodeHoverCardGroup = (): NodeHoverCardGroup | null => useContext(NodeHoverCardGroupContext);
