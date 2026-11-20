import { cloneElement, forwardRef, Fragment, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { makeStyles, mergeClasses, Popover, PopoverSurface, shorthands, useMergedRefs } from '@fluentui/react-components';
import { nodeHoverCardTiming, nodeMetrics } from '../metrics';
import { NodeHoverCardActiveContext } from '../primitives/NodeText';
import { useDesignerUiOutlet } from '../../theme/DesignerUiScope';
import { useNodeHoverCardGroup } from './nodeHoverCardGroup';

/**
 * Opt-out marker for interactive descendants (tool rows, add/expand buttons) embedded in a hover trigger.
 * Presence alone opts out, including an empty value; pointer or focus inside a marked subtree never opens the card.
 */
export const NODE_HOVER_CARD_IGNORE_ATTRIBUTE = 'data-node-hover-card-ignore' as const;
const IGNORE_SELECTOR = `[${NODE_HOVER_CARD_IGNORE_ATTRIBUTE}]`;
const FOCUS_VISIBLE_ATTRIBUTE = 'data-fui-focus-visible';
const DESCRIPTION_TARGET_ATTRIBUTE = 'data-node-hover-card-description-target';
type DescribedChildProps = HTMLAttributes<HTMLElement> & { [DESCRIPTION_TARGET_ATTRIBUTE]?: string };

type Presence = { pointer: boolean; focus: boolean; surfacePointer: boolean; surfaceFocus: boolean };

// Targets can come from an iframe document or be SVG/text nodes, so use DOM capability checks
// instead of `instanceof Element` against this window's constructors.
const asElement = (value: EventTarget | null): Element | null => {
  const node = value as (Partial<Element> & Partial<Node>) | null;
  if (!node) {
    return null;
  }
  if (typeof node.closest === 'function') {
    return node as Element;
  }
  const parent = node.parentElement;
  return parent && typeof parent.closest === 'function' ? parent : null;
};
// Only markers inside the triggering region count, so a host marking an ancestor of the whole card is not misread.
const isIgnored = (value: EventTarget | null, region: Node | null) => {
  const marked = asElement(value)?.closest(IGNORE_SELECTOR);
  return !!marked && (!region || region.contains(marked));
};
// Fluent marks keyboard-driven focus; mouse focus and programmatic restoration lack the marker and must not open.
const isFocusVisible = (value: EventTarget | null) => !!asElement(value)?.hasAttribute(FOCUS_VISIBLE_ATTRIBUTE);
const useStyles = makeStyles({
  trigger: { display: 'inline-flex' },
  surface: {
    maxWidth: '100vw',
    padding: 0,
    ...shorthands.borderStyle('none'),
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
});
export interface NodeHoverCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode;
  card: ReactNode | ((close: () => void) => ReactNode);
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
  externalFocusTarget?: HTMLElement | null;
  triggerRef?: Ref<HTMLDivElement>;
  /**
   * `above` (default) keeps the Otto placement. `side` opens beside the node and flips when blocked, so canvas hosts
   * with vertical flows do not cover the upstream node or its incoming edge.
   */
  placement?: 'above' | 'side';
}
export const NodeHoverCard = forwardRef<HTMLDivElement, NodeHoverCardProps>(function NodeHoverCard(
  {
    children,
    card,
    openDelay = nodeHoverCardTiming.openDelay,
    closeDelay = nodeHoverCardTiming.closeDelay,
    disabled = false,
    externalFocusTarget,
    triggerRef,
    placement = 'above',
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const outlet = useDesignerUiOutlet();
  const group = useNodeHoverCardGroup();
  // Stable identity for the scoped coordinator: release/cancel are identity-checked so a late cleanup from this
  // card can never clear a slot that a newer card already owns.
  const [owner] = useState(() => Symbol('NodeHoverCard'));
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  // Timers are created and cleared through the trigger's owner window so iframe-hosted designers stay isolated.
  const timer = useRef<{ owner: Window; id: number }>();
  // Direction of the pending timer: true = opening, false = closing, undefined = none. Repeated events in the same
  // direction keep the original deadline instead of rescheduling.
  const pending = useRef<boolean>();
  const openRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  // Pointer and focus are tracked separately so leaving with one channel never dismisses a user still on the other.
  const presence = useRef<Presence>({ pointer: false, focus: false, surfacePointer: false, surfaceFocus: false });
  // Set while focus is programmatically restored after Escape/Dismiss so that restoration is not a fresh activation.
  const restoring = useRef(false);
  const cardId = useId();

  const clearTimer = useCallback(() => {
    if (timer.current) {
      timer.current.owner.clearTimeout(timer.current.id);
      timer.current = undefined;
    }
    pending.current = undefined;
  }, []);
  // Handed to the coordinator: a newer pending card may cancel only our opening, never our open or closing state.
  const cancelLocalPending = useCallback(() => {
    if (pending.current === true) {
      clearTimer();
    }
  }, [clearTimer]);
  const closeNow = useCallback(() => {
    clearTimer();
    group?.cancel(owner);
    group?.release(owner);
    presence.current = { pointer: false, focus: false, surfacePointer: false, surfaceFocus: false };
    openRef.current = false;
    setOpen(false);
  }, [clearTimer, group, owner]);
  const startTimer = useCallback(
    (direction: boolean, delay: number, fire: () => void) => {
      const view = target?.ownerDocument.defaultView;
      if (!view) {
        return false;
      }
      pending.current = direction;
      timer.current = {
        owner: view,
        id: view.setTimeout(() => {
          timer.current = undefined;
          pending.current = undefined;
          fire();
        }, delay),
      };
      return true;
    },
    [target]
  );
  const requestOpen = useCallback(() => {
    if (disabledRef.current) {
      return;
    }
    if (openRef.current) {
      // Re-entry during the close grace keeps the card; an already open card needs no new open timer.
      if (pending.current === false) {
        clearTimer();
      }
      return;
    }
    if (pending.current === true) {
      return;
    }
    clearTimer();
    if (!target?.ownerDocument.defaultView) {
      return;
    }
    group?.prepare(owner, cancelLocalPending);
    startTimer(true, openDelay, () => {
      // The deadline may outlive a disable or a newer scoped owner; only the current pending owner may commit.
      if (disabledRef.current || (group && !group.claim(owner, closeNow))) {
        group?.cancel(owner);
        return;
      }
      openRef.current = true;
      setOpen(true);
    });
  }, [cancelLocalPending, clearTimer, closeNow, group, openDelay, owner, startTimer, target]);
  const requestClose = useCallback(() => {
    if (!openRef.current) {
      clearTimer();
      group?.cancel(owner);
      return;
    }
    if (pending.current === false) {
      return;
    }
    clearTimer();
    startTimer(false, closeDelay, () => {
      openRef.current = false;
      setOpen(false);
      group?.release(owner);
    });
  }, [clearTimer, closeDelay, group, owner, startTimer]);
  const maybeClose = useCallback(() => {
    const { pointer, focus, surfacePointer, surfaceFocus } = presence.current;
    if (!pointer && !focus && !surfacePointer && !surfaceFocus) {
      requestClose();
    }
  }, [requestClose]);
  // Cancels only a close grace; an opening card is left alone (entering the surface or focusing it never opens).
  const keepOpen = useCallback(() => {
    if (openRef.current && pending.current === false) {
      clearTimer();
    }
  }, [clearTimer]);
  // Admission for focus that should retain (not open) the card. Deliberately narrower than "inside the external
  // owner": sibling controls of a React Flow node (branch header, tool rows) must not keep the parent card alive.
  const retainsFocus = useCallback(
    (next: EventTarget | null) => {
      const node = next as Node | null;
      if (!node) {
        return false;
      }
      if (surface.current?.contains(node) || node === externalFocusTarget) {
        return true;
      }
      return !!target?.contains(node) && !isIgnored(node, target);
    },
    [externalFocusTarget, target]
  );
  const dismiss = useCallback(() => {
    const doc = surface.current?.ownerDocument;
    const surfaceOwnsFocus = !!doc?.activeElement && !!surface.current?.contains(doc.activeElement);
    closeNow();
    if (!surfaceOwnsFocus) {
      return;
    }
    // The surface is about to unmount with focus inside it: hand focus back to the node instead of the body.
    const fallback = Array.from(
      target?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []
    ).find((element) => !element.matches(':disabled') && !element.closest('[hidden], [inert]') && !isIgnored(element, target));
    const restoreTo = externalFocusTarget?.isConnected ? externalFocusTarget : fallback;
    if (restoreTo) {
      restoring.current = true;
      try {
        restoreTo.focus();
      } finally {
        restoring.current = false;
      }
    }
  }, [closeNow, externalFocusTarget, target]);
  const onTriggerFocus = useCallback(
    (focused: EventTarget | null) => {
      if (isIgnored(focused, target)) {
        presence.current.focus = false;
        maybeClose();
      } else if (!restoring.current && isFocusVisible(focused)) {
        // Only keyboard-visible focus opens: click focus and focus restoration would leave a card open under no pointer.
        presence.current.focus = true;
        requestOpen();
      } else if (openRef.current) {
        presence.current.focus = true;
        keepOpen();
      } else {
        // Focus inside the trigger is not enough while opening: a restored/unmarked descendant must cancel
        // keyboard-only intent, without cancelling a still-eligible pointer channel.
        presence.current.focus = false;
        maybeClose();
      }
    },
    [keepOpen, maybeClose, requestOpen, target]
  );
  const onFocusLeave = useCallback(
    (next: EventTarget | null) => {
      presence.current.focus = false;
      // An eligible next target sets presence again in its own focus handler.
      if (!retainsFocus(next)) {
        maybeClose();
      }
    },
    [maybeClose, retainsFocus]
  );
  const setTrigger = useMergedRefs(setTarget, triggerRef, ref);

  // A changed external owner is a lifecycle boundary too, even for pointer-driven opening. Clear all channels
  // and registrations immediately; focusout from the old owner will no longer reach the new listeners.
  useEffect(() => closeNow, [closeNow, target, externalFocusTarget]);
  useEffect(() => {
    if (disabled) {
      closeNow();
    }
  }, [disabled, closeNow]);
  useEffect(() => {
    if (!externalFocusTarget) {
      return;
    }
    const onFocusIn = (event: FocusEvent) => {
      const focused = event.target as Node | null;
      // Exact owner or a non-ignored trigger descendant only; anything else inside the owner is a sibling control.
      if (focused === externalFocusTarget || (!!focused && !!target?.contains(focused))) {
        onTriggerFocus(focused);
      } else {
        presence.current.focus = false;
        maybeClose();
      }
    };
    const onFocusOut = (event: FocusEvent) => onFocusLeave(event.relatedTarget);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };
    externalFocusTarget.addEventListener('focusin', onFocusIn);
    externalFocusTarget.addEventListener('focusout', onFocusOut);
    externalFocusTarget.addEventListener('keydown', onKey);
    return () => {
      externalFocusTarget.removeEventListener('focusin', onFocusIn);
      externalFocusTarget.removeEventListener('focusout', onFocusOut);
      externalFocusTarget.removeEventListener('keydown', onKey);
    };
  }, [externalFocusTarget, dismiss, maybeClose, onFocusLeave, onTriggerFocus, target]);
  useEffect(() => {
    if (!open) {
      return;
    }
    // The private marker follows the child's own HTML forwarding, even if it renders a layout wrapper first.
    // Update its description and the external owner's symmetrically; cleanup removes only our token from live DOM.
    const describedTargets = new Set(
      [target?.querySelector(`[${DESCRIPTION_TARGET_ATTRIBUTE}="${cardId}"]`), externalFocusTarget].filter(
        (element): element is Element => !!element
      )
    );
    for (const element of describedTargets) {
      const existing = element.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
      element.setAttribute('aria-describedby', Array.from(new Set([...existing, cardId])).join(' '));
    }
    return () => {
      for (const element of describedTargets) {
        const next = element
          .getAttribute('aria-describedby')
          ?.split(/\s+/)
          .filter((part) => part && part !== cardId)
          .join(' ');
        if (next) {
          element.setAttribute('aria-describedby', next);
        } else {
          element.removeAttribute('aria-describedby');
        }
      }
    };
  }, [open, externalFocusTarget, cardId, children, target]);
  // Clone only a private locator, not aria-describedby: a changed description prop on close would overwrite
  // tokens added by the host while open. Fragments do not forward HTML attributes to a DOM element.
  const described =
    isValidElement<DescribedChildProps>(children) && children.type !== Fragment
      ? cloneElement(children, { [DESCRIPTION_TARGET_ATTRIBUTE]: cardId })
      : children;
  return (
    <>
      <div
        {...rest}
        ref={setTrigger}
        className={mergeClasses(styles.trigger, className)}
        // Bubbling mouseover (not mouseenter) sees moves between node content and ignored descendants.
        onMouseOver={(event) => {
          rest.onMouseOver?.(event);
          if (isIgnored(event.target, target)) {
            presence.current.pointer = false;
            maybeClose();
          } else {
            presence.current.pointer = true;
            requestOpen();
          }
        }}
        onMouseLeave={(event) => {
          rest.onMouseLeave?.(event);
          presence.current.pointer = false;
          maybeClose();
        }}
        onFocus={(event) => {
          rest.onFocus?.(event);
          // When the external owner wraps the trigger, its native focusin listener already handles admission.
          if (!externalFocusTarget?.contains(event.target as Node)) {
            onTriggerFocus(event.target);
          }
        }}
        onBlur={(event) => {
          rest.onBlur?.(event);
          if (!externalFocusTarget?.contains(event.target as Node)) {
            onFocusLeave(event.relatedTarget);
          }
        }}
        onKeyDown={(event) => {
          rest.onKeyDown?.(event);
          // No stopPropagation: host shortcuts on ancestors still see Escape.
          if (event.key === 'Escape') {
            dismiss();
          }
        }}
      >
        <NodeHoverCardActiveContext.Provider value={!disabled}>{described}</NodeHoverCardActiveContext.Provider>
      </div>
      <Popover
        open={open}
        mountNode={outlet ?? target?.ownerDocument.body}
        onOpenChange={(_, data) => {
          // Fluent only dismisses here (outside click, Escape); opening always goes through the scoped timer path.
          if (!data.open) {
            dismiss();
          }
        }}
        positioning={
          placement === 'side'
            ? {
                target,
                position: 'after',
                align: 'top',
                offset: nodeMetrics.hoverCard.offset,
                fallbackPositions: ['before', 'below', 'above'],
              }
            : { target, position: 'above', align: 'start', offset: nodeMetrics.hoverCard.offset }
        }
        trapFocus={false}
        unstable_disableAutoFocus
      >
        <PopoverSurface
          className={styles.surface}
          onMouseEnter={() => {
            presence.current.surfacePointer = true;
            keepOpen();
          }}
          onMouseLeave={() => {
            presence.current.surfacePointer = false;
            maybeClose();
          }}
          onFocus={() => {
            presence.current.surfaceFocus = true;
            keepOpen();
          }}
          onBlur={(event) => {
            presence.current.surfaceFocus = false;
            if (!retainsFocus(event.relatedTarget)) {
              maybeClose();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              dismiss();
            }
          }}
        >
          <div ref={surface} id={cardId}>
            {typeof card === 'function' ? card(dismiss) : card}
          </div>
        </PopoverSurface>
      </Popover>
    </>
  );
});
