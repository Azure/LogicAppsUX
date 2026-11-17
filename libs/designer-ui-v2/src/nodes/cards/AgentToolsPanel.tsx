import { Children, forwardRef, isValidElement, useId, useLayoutEffect, useRef } from 'react';
import type { FocusEventHandler, ForwardedRef, HTMLAttributes, MouseEvent, MutableRefObject } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { AddRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { useCollapseReveal } from '../primitives/collapseReveal';
import { useNodeHeaderButtonStyles } from '../primitives/nodeHeaderButton';
import type { AgentToolsStrings } from '../strings';
import { defaultNodeStrings } from '../strings';

const panelSurface = {
  boxSizing: 'border-box',
  ...shorthands.border(tokens.strokeWidthThin, 'solid', designerUiTokens.nodeBorder),
  borderRadius: tokens.borderRadius2XLarge,
  '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
} as const;

const useStyles = makeStyles({
  panel: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    width: `${nodeMetrics.cards.agent.width}px`,
    padding: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground1,
    ...panelSurface,
  },
  opaqueSurface: {
    backgroundColor: designerUiTokens.nodeAgentSurface,
  },
  transparentSurface: {
    backgroundColor: 'transparent',
    ...shorthands.borderColor('transparent'),
    '@media (forced-colors: active)': { ...shorthands.borderColor('transparent') },
  },
  decoration: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    ...panelSurface,
  },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, height: `${nodeMetrics.toolsHeader}px` },
  heading: {
    flexGrow: 1,
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    fontVariantNumeric: 'tabular-nums',
  },
  chevron: {
    transitionProperty: 'transform',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
  },
  chevronCollapsed: { transform: 'rotate(180deg)' },
  // Moving bottom border cap displayed only while clip-path animates on an opaque panel.
  revealEdge: {
    display: 'none',
    position: 'absolute',
    left: `calc(-1 * ${tokens.strokeWidthThin})`,
    right: `calc(-1 * ${tokens.strokeWidthThin})`,
    height: tokens.borderRadiusLarge,
    boxSizing: 'border-box',
    borderBottomLeftRadius: tokens.borderRadiusLarge,
    borderBottomRightRadius: tokens.borderRadiusLarge,
    borderLeft: `${tokens.strokeWidthThin} solid ${designerUiTokens.nodeBorder}`,
    borderRight: `${tokens.strokeWidthThin} solid ${designerUiTokens.nodeBorder}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${designerUiTokens.nodeBorder}`,
    backgroundColor: designerUiTokens.nodeAgentSurface,
    pointerEvents: 'none',
    transform: 'translateY(-100%)',
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
  },
  bodyClosed: { opacity: 0 },
  bodyOpen: { opacity: 1 },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, margin: 0, padding: 0, listStyleType: 'none' },
  addRow: { display: 'flex', justifyContent: 'center' },
  add: {
    minWidth: 0,
    position: 'relative',
    overflow: 'visible',
    // Expand the bottom Add button hit target vertically to 40px without increasing visual button height.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: `calc(-1 * ${tokens.spacingVerticalS} - ${tokens.strokeWidthThick}) 0`,
    },
  },
});

const setForwardedRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    (ref as MutableRefObject<T | null>).current = value;
  }
};

export type AgentToolsSurface = 'opaque' | 'transparent';

export interface AgentToolsDecorationProps extends HTMLAttributes<HTMLElement> {}

export const AgentToolsDecoration = forwardRef<HTMLElement, AgentToolsDecorationProps>(function AgentToolsDecoration(
  { className, ...rest },
  ref
) {
  const styles = useStyles();
  return <section {...rest} ref={ref} className={mergeClasses(styles.decoration, styles.opaqueSurface, className)} />;
});

export interface AgentToolsPanelProps extends HTMLAttributes<HTMLElement> {
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onAddTool?: (anchor?: HTMLElement | null) => void;
  surface?: AgentToolsSurface;
  strings?: AgentToolsStrings;
}
export const AgentToolsPanel = forwardRef<HTMLElement, AgentToolsPanelProps>(function AgentToolsPanel(
  { children, expanded = true, onToggleExpanded, onAddTool, surface = 'opaque', strings = defaultNodeStrings.tools, className, ...rest },
  ref
) {
  const styles = useStyles();
  const headerButtonStyles = useNodeHeaderButtonStyles();
  const headingId = useId();
  const listId = useId();
  const items = Children.toArray(children);
  const panelRef = useRef<HTMLElement | null>(null);
  const edgeRef = useRef<HTMLSpanElement | null>(null);
  const bodyWrapperRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const wasExpanded = useRef(expanded);
  const bodyOwnsFocusRef = useRef(false);

  useLayoutEffect(() => {
    const previousExpanded = wasExpanded.current;
    wasExpanded.current = expanded;
    const panel = panelRef.current;
    const body = bodyWrapperRef.current;
    if (!previousExpanded || expanded || !panel || !body) {
      return;
    }
    const doc = body.ownerDocument;
    const activeElement = doc.activeElement;
    const view = doc.defaultView;
    const activeIsElement = !!view && activeElement instanceof view.Element;
    const activeInsideBody = activeIsElement && body.contains(activeElement);
    const activeIsBodyOrNull = activeElement == null || activeElement === doc.body;
    // Commit-time focus check prevents stale render snapshots from stealing external focus.
    if (!activeInsideBody && !(activeIsBodyOrNull && bodyOwnsFocusRef.current)) {
      return;
    }
    bodyOwnsFocusRef.current = false;
    if (toggleRef.current) {
      toggleRef.current.focus();
      return;
    }
    if (!panel.hasAttribute('tabindex')) {
      panel.setAttribute('tabindex', '-1');
      // Retain the fallback's focusability until blur; never remove a host-supplied tabindex.
      panel.addEventListener(
        'blur',
        () => {
          if (panel.getAttribute('tabindex') === '-1') {
            panel.removeAttribute('tabindex');
          }
        },
        { once: true }
      );
    }
    panel.focus();
  }, [expanded]);

  const handleBodyFocusCapture: FocusEventHandler<HTMLDivElement> = (event) => {
    bodyOwnsFocusRef.current = event.currentTarget.contains(event.target as Node);
  };
  const handleBodyBlurCapture: FocusEventHandler<HTMLDivElement> = (event) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus == null || event.currentTarget.contains(nextFocus)) {
      return;
    }
    bodyOwnsFocusRef.current = false;
  };

  const applyReveal = (visiblePx: number, fullPx: number) => {
    const el = panelRef.current;
    if (!el) {
      return;
    }
    const insetBottom = Math.max(0, fullPx - visiblePx);
    el.style.clipPath = `inset(0px 0px ${insetBottom}px 0px round ${tokens.borderRadiusLarge})`;
    const edge = edgeRef.current;
    if (edge) {
      edge.style.display = 'block';
      edge.style.top = `${Math.max(0, visiblePx)}px`;
    }
  };
  const clearReveal = () => {
    const el = panelRef.current;
    if (el) {
      el.style.clipPath = '';
    }
    const edge = edgeRef.current;
    if (edge) {
      edge.style.display = 'none';
      edge.style.top = '';
    }
  };
  const measureFull = () => {
    const el = panelRef.current;
    if (!el) {
      return nodeMetrics.toolsPanel.collapsedHeight;
    }
    const prevClip = el.style.clipPath;
    el.style.clipPath = '';
    const full = el.offsetHeight || nodeMetrics.toolsPanel.collapsedHeight;
    el.style.clipPath = prevClip;
    return full;
  };
  const reveal = useCollapseReveal({
    expanded,
    collapsedHeight: nodeMetrics.toolsPanel.collapsedHeight,
    motionRoot: () => panelRef.current,
    measureFull,
    apply: applyReveal,
    clear: clearReveal,
  });
  const bodyMounted = expanded || !reveal.hidden;
  const bodyOpen = reveal.open;

  // Clear clip-path and revealEdge once the collapsed body finishes unmounting.
  useLayoutEffect(() => {
    if (!bodyMounted) {
      clearReveal();
    }
  }, [bodyMounted]);

  useLayoutEffect(() => {
    const body = bodyWrapperRef.current;
    if (!body) {
      return;
    }
    if (!expanded && bodyMounted) {
      body.setAttribute('inert', '');
    } else {
      body.removeAttribute('inert');
    }
  }, [expanded, bodyMounted]);

  const stop = (event: MouseEvent) => event.stopPropagation();
  const add = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onAddTool?.(event.currentTarget);
  };
  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleExpanded?.();
  };
  return (
    <section
      data-testid="agent-tools-panel"
      {...rest}
      ref={(node) => {
        panelRef.current = node;
        setForwardedRef(ref, node);
      }}
      className={mergeClasses(styles.panel, surface === 'opaque' ? styles.opaqueSurface : styles.transparentSurface, className)}
      aria-labelledby={headingId}
    >
      {surface === 'opaque' ? <span ref={edgeRef} className={styles.revealEdge} aria-hidden="true" /> : null}
      <div className={styles.header}>
        <h3 id={headingId} className={styles.heading}>
          {strings.heading(items.length)}
        </h3>
        {onAddTool ? (
          <Button
            shape="circular"
            appearance="subtle"
            size="small"
            className={mergeClasses('nodrag', headerButtonStyles.button)}
            icon={{ className: headerButtonStyles.icon, children: <AddRegular /> }}
            aria-label={strings.addTools}
            onClick={add}
            onMouseDown={stop}
          />
        ) : null}
        {onToggleExpanded ? (
          <Button
            ref={toggleRef}
            shape="circular"
            appearance="subtle"
            size="small"
            className={mergeClasses('nodrag', headerButtonStyles.button)}
            icon={{
              className: mergeClasses(headerButtonStyles.icon, styles.chevron, !expanded && styles.chevronCollapsed),
              children: <ChevronUpRegular />,
            }}
            aria-label={expanded ? strings.collapseTools : strings.expandTools}
            aria-expanded={expanded}
            aria-controls={bodyMounted ? listId : undefined}
            onClick={toggle}
            onMouseDown={stop}
          />
        ) : null}
      </div>
      {bodyMounted ? (
        <div
          ref={bodyWrapperRef}
          onFocusCapture={handleBodyFocusCapture}
          onBlurCapture={handleBodyBlurCapture}
          className={mergeClasses(styles.body, bodyOpen ? styles.bodyOpen : styles.bodyClosed)}
          aria-hidden={expanded ? undefined : true}
        >
          <ul id={listId} className={styles.list}>
            {items.map((child, index) => (
              <li key={isValidElement(child) ? (child.key ?? index) : index}>{child}</li>
            ))}
          </ul>
          {onAddTool ? (
            <div className={styles.addRow}>
              {/* Fluent's icon slot defaults to 20px even on small buttons; reuse the header's 16px action glyph contract. */}
              <Button
                size="small"
                shape="circular"
                className={mergeClasses('nodrag', styles.add)}
                icon={{ className: headerButtonStyles.icon, children: <AddRegular /> }}
                onClick={add}
                onMouseDown={stop}
              >
                {strings.add}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});
