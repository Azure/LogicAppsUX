import { cloneElement, forwardRef, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { makeStyles, mergeClasses, Popover, PopoverSurface, shorthands, useMergedRefs } from '@fluentui/react-components';
import { nodeHoverCardTiming, nodeMetrics } from '../metrics';
import { NodeHoverCardActiveContext } from '../primitives/NodeText';
import { useDesignerUiOutlet } from '../../theme/DesignerUiScope';
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
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const outlet = useDesignerUiOutlet();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const timer = useRef<{ owner: Window; id: number }>();
  const cardId = useId();
  const clearTimer = useCallback(() => {
    if (timer.current) {
      timer.current.owner.clearTimeout(timer.current.id);
      timer.current = undefined;
    }
  }, []);
  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);
  const schedule = useCallback(
    (next: boolean, delay: number) => {
      clearTimer();
      const owner = target?.ownerDocument.defaultView;
      if (!owner || (next && disabled)) {
        return;
      }
      timer.current = {
        owner,
        id: owner.setTimeout(() => {
          timer.current = undefined;
          setOpen(next);
        }, delay),
      };
    },
    [clearTimer, disabled, target]
  );
  const show = useCallback(() => {
    if (open) {
      clearTimer();
    } else {
      schedule(true, openDelay);
    }
  }, [open, clearTimer, schedule, openDelay]);
  const hide = useCallback(() => {
    if (open) {
      schedule(false, closeDelay);
    } else {
      clearTimer();
    }
  }, [open, schedule, closeDelay, clearTimer]);
  const contains = useCallback(
    (next: EventTarget | null) => {
      // The target may be in an iframe: avoid instanceof against the global document's Node constructor.
      const node = next as Node | null;
      return !!node && (target?.contains(node) || surface.current?.contains(node) || externalFocusTarget?.contains(node));
    },
    [target, externalFocusTarget]
  );
  const setTrigger = useMergedRefs(setTarget, triggerRef, ref);
  useEffect(() => clearTimer, [clearTimer]);
  useEffect(() => {
    if (disabled) {
      close();
    }
  }, [disabled, close]);
  useEffect(() => {
    if (!externalFocusTarget) {
      return;
    }
    const onBlur = (event: FocusEvent) => {
      if (!contains(event.relatedTarget)) {
        hide();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    externalFocusTarget.addEventListener('focusin', show);
    externalFocusTarget.addEventListener('focusout', onBlur);
    externalFocusTarget.addEventListener('keydown', onKey);
    return () => {
      externalFocusTarget.removeEventListener('focusin', show);
      externalFocusTarget.removeEventListener('focusout', onBlur);
      externalFocusTarget.removeEventListener('keydown', onKey);
    };
  }, [externalFocusTarget, show, hide, close, contains]);
  useEffect(() => {
    if (!open || !externalFocusTarget) {
      return;
    }
    const existing = externalFocusTarget.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
    externalFocusTarget.setAttribute('aria-describedby', Array.from(new Set([...existing, cardId])).join(' '));
    return () => {
      const next = externalFocusTarget
        .getAttribute('aria-describedby')
        ?.split(/\s+/)
        .filter((part) => part && part !== cardId)
        .join(' ');
      if (next) {
        externalFocusTarget.setAttribute('aria-describedby', next);
      } else {
        externalFocusTarget.removeAttribute('aria-describedby');
      }
    };
  }, [open, externalFocusTarget, cardId]);
  const described =
    open && isValidElement<HTMLAttributes<HTMLElement>>(children)
      ? cloneElement(children, { 'aria-describedby': [children.props['aria-describedby'], cardId].filter(Boolean).join(' ') })
      : children;
  return (
    <>
      <div
        {...rest}
        ref={setTrigger}
        className={mergeClasses(styles.trigger, className)}
        onMouseEnter={(event) => {
          rest.onMouseEnter?.(event);
          show();
        }}
        onMouseLeave={(event) => {
          rest.onMouseLeave?.(event);
          hide();
        }}
        onFocus={(event) => {
          rest.onFocus?.(event);
          show();
        }}
        onBlur={(event) => {
          rest.onBlur?.(event);
          if (!contains(event.relatedTarget)) {
            hide();
          }
        }}
        onKeyDown={(event) => {
          rest.onKeyDown?.(event);
          if (event.key === 'Escape') {
            close();
          }
        }}
      >
        <NodeHoverCardActiveContext.Provider value={!disabled}>{described}</NodeHoverCardActiveContext.Provider>
      </div>
      <Popover
        open={open}
        mountNode={outlet ?? target?.ownerDocument.body}
        onOpenChange={(_, data) => {
          clearTimer();
          setOpen(data.open);
        }}
        positioning={{ target, position: 'above', align: 'start', offset: nodeMetrics.hoverCard.offset }}
        trapFocus={false}
        unstable_disableAutoFocus
      >
        <PopoverSurface
          className={styles.surface}
          onMouseEnter={clearTimer}
          onMouseLeave={hide}
          onBlur={(event) => {
            if (!contains(event.relatedTarget)) {
              hide();
            }
          }}
        >
          <div ref={surface} id={cardId}>
            {typeof card === 'function' ? card(close) : card}
          </div>
        </PopoverSurface>
      </Popover>
    </>
  );
});
