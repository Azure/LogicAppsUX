import { forwardRef, useContext, useId, useLayoutEffect, useRef } from 'react';
import type { FocusEventHandler, ForwardedRef, HTMLAttributes, MutableRefObject, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ArrowRepeatAllRegular, ArrowTurnRightRegular, BoxMultipleRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { verticalBadgeLeft } from './badgePlacement';
import type { NodeRunStatus, NodeHandleVariant } from '../types';
import type { ActionNodeCardStrings, NodeFrameCountLabel, NodeFrameStrings } from '../strings';
import { defaultNodeFrameStrings, defaultNodeStrings } from '../strings';
import { formatNodeFrameCount } from '../countLabel';
import { useCollapseReveal } from './collapseReveal';
import { NodeStatusBadge } from './NodeStatusBadge';
import { NodeHandle, NodeInactiveContext } from './NodeHandle';
import type { NodeHandleAxis } from './NodeHandle';
import { IfIconRegular } from './IfIcon';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minWidth: `${nodeMetrics.frame.minWidth}px`,
    ...shorthands.border(tokens.strokeWidthThin, 'dashed', tokens.colorNeutralStroke1),
    borderRadius: tokens.borderRadius2XLarge,
    backgroundColor: tokens.colorNeutralBackgroundAlpha2,
    color: tokens.colorNeutralForeground1,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  success: { ...shorthands.borderColor(tokens.colorStatusSuccessBorder2) },
  danger: { ...shorthands.borderColor(tokens.colorStatusDangerBorder2) },
  selected: {
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor(designerUiTokens.nodeBorderSelected),
    outline: `${tokens.strokeWidthThin} solid ${designerUiTokens.nodeBorderSelected}`,
    outlineOffset: `calc(-1 * ${tokens.strokeWidthThick})`,
    '@media (forced-colors: active)': { ...shorthands.borderColor('Highlight'), outlineColor: 'Highlight' },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalM,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  headerBodyText: {
    minHeight: '24px',
    paddingInline: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  titleBodyText: { fontWeight: tokens.fontWeightRegular },
  glyph: {
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorPaletteLilacForeground2,
    '@media (forced-colors: active)': { color: 'CanvasText' },
  },
  title: { fontWeight: tokens.fontWeightSemibold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  titleRow: { display: 'inline-flex', alignItems: 'baseline', minWidth: 0, overflow: 'hidden' },
  actionCountDot: { marginInline: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3 },
  actionCount: {
    flexShrink: 0,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  subtitle: { flexShrink: 0, color: tokens.colorNeutralForeground3 },
  headerStacked: { alignItems: 'flex-start' },
  titleStack: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  subtitleBelow: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
  },
  action: { display: 'inline-flex', alignItems: 'center', marginInlineStart: 'auto' },
  body: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    gap: tokens.spacingHorizontalXXL,
    minHeight: `${nodeMetrics.frame.minBodyHeight}px`,
    paddingInline: tokens.spacingHorizontalXXL,
    paddingBottom: tokens.spacingVerticalL,
  },
  bodyReveal: {
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
  },
  bodyClosed: { opacity: 0 },
  bodyOpen: { opacity: 1 },
  headerless: { paddingTop: tokens.spacingVerticalL },
  collapsedBody: { display: 'none' },
  inputHandle: { position: 'absolute', top: '50%', left: `${nodeMetrics.handle.edgeOffset}px`, transform: 'translateY(-50%)' },
  outputHandle: { position: 'absolute', top: '50%', right: `${nodeMetrics.handle.edgeOffset}px`, transform: 'translateY(-50%)' },
  inputHandleVertical: { position: 'absolute', top: `${nodeMetrics.handle.edgeOffset}px`, left: '50%', transform: 'translateX(-50%)' },
  outputHandleVertical: { position: 'absolute', bottom: `${nodeMetrics.handle.edgeOffset}px`, left: '50%', transform: 'translateX(-50%)' },
  badge: { position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 },
  // Default to the same clearance as NodeCard when the host does not position the input port.
  badgeVertical: { left: verticalBadgeLeft, transform: 'translateY(-50%)', whiteSpace: 'nowrap' },
  focus: { ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' } },
  inactive: { opacity: nodeMetrics.inactiveOpacity },
});

const KIND_GLYPHS = {
  scope: <BoxMultipleRegular />,
  loop: <ArrowRepeatAllRegular />,
  condition: <IfIconRegular />,
  switch: <ArrowTurnRightRegular />,
  branch: null,
} as const;
const KIND_DATA = {
  scope: 'scope',
  loop: 'loop-frame',
  condition: 'condition-frame',
  switch: 'switch-frame',
  branch: 'branch-frame',
} as const;

const STROKE_WIDTH_THIN = Number.parseFloat(tokens.strokeWidthThin) || nodeMetrics.cards.switch.borderWidth;

const setForwardedRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    (ref as MutableRefObject<T | null>).current = value;
  }
};

export interface NodeFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** `branch` is a glyphless lane with body-text header treatment. */
  kind: keyof typeof KIND_GLYPHS;
  /** Semantic border color; defaults to neutral and never overrides selection. */
  tone?: 'neutral' | 'success' | 'danger';
  /** Hides the mounted body, leaving the header visible; defaults to false. */
  collapsed?: boolean;
  /** Omit or leave empty for a headerless body. */
  title?: string;
  subtitle?: string;
  /** Count shown inline with the title, independently of subtitle placement. `countLabel` wins when both are set. */
  actionCount?: number;
  /** Unit-aware inline count (actions, cases, tools, hidden items); the frame dictionary formats and pluralizes it. */
  countLabel?: NodeFrameCountLabel;
  /** Inline by default; below stacks a caption under the title. */
  subtitlePlacement?: 'inline' | 'below';
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
  statusLabel?: string;
  statusAriaLabel?: string;
  /** Dims a frame that did not run; nested cards inherit the dimming without compounding it. */
  inactive?: boolean;
  action?: ReactNode;
  handles?: boolean;
  /** Real host port slots imply handles. */
  inputSlot?: ReactNode;
  outputSlot?: ReactNode;
  /** Horizontal: distance from top to the port row. */
  handleTop?: number;
  handleAxis?: NodeHandleAxis;
  /** Vertical: distance from left to the port column. */
  handleLeft?: number;
  showInputHandle?: boolean;
  inputVariant?: NodeHandleVariant;
  headerAppearance?: 'default' | 'plain';
  /** `none` preserves current display:none collapse semantics; `reveal` animates with mounted content. */
  motion?: 'none' | 'reveal';
  strings?: ActionNodeCardStrings & { frame?: NodeFrameStrings };
}

/** Canonical translucent scope/loop/branch frame; host computes bounds and topology. */
export const NodeFrame = forwardRef<HTMLDivElement, NodeFrameProps>(function NodeFrame(
  {
    kind,
    tone = 'neutral',
    collapsed = false,
    title,
    subtitle,
    actionCount,
    countLabel,
    subtitlePlacement = 'inline',
    selected = false,
    status,
    statusDetail,
    statusLabel,
    statusAriaLabel,
    inactive = false,
    action,
    children,
    handles = false,
    inputSlot,
    outputSlot,
    handleTop,
    handleAxis = 'horizontal',
    handleLeft,
    showInputHandle = true,
    inputVariant = 'neutral',
    headerAppearance = 'default',
    motion = 'none',
    strings = defaultNodeStrings,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLSpanElement | null>(null);
  const wasCollapsed = useRef(collapsed);
  const bodyOwnsFocusRef = useRef(false);

  useLayoutEffect(() => {
    const previousCollapsed = wasCollapsed.current;
    wasCollapsed.current = collapsed;
    const root = rootRef.current;
    const body = bodyRef.current;
    if (previousCollapsed || !collapsed || !root || !body) {
      return;
    }
    const doc = body.ownerDocument;
    const activeElement = doc.activeElement;
    const view = doc.defaultView;
    const activeIsElement = !!view && activeElement instanceof view.Element;
    const activeInsideBody = activeIsElement && body.contains(activeElement);
    const activeIsBodyOrNull = activeElement == null || activeElement === doc.body;
    // Decide on commit from current DOM focus: rescue only if body still owns focus or focus fell back to body/null.
    if (!activeInsideBody && !(activeIsBodyOrNull && bodyOwnsFocusRef.current)) {
      return;
    }
    bodyOwnsFocusRef.current = false;
    const actionTarget = actionRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
    );
    actionTarget?.focus();
    if (actionTarget && root.ownerDocument.activeElement === actionTarget) {
      return;
    }
    if (!root.hasAttribute('tabindex')) {
      root.setAttribute('tabindex', '-1');
      // Removing tabindex immediately after focus can blur the fallback in browsers. Host tabindex is never ours to remove.
      root.addEventListener(
        'blur',
        () => {
          if (root.getAttribute('tabindex') === '-1') {
            root.removeAttribute('tabindex');
          }
        },
        { once: true }
      );
    }
    root.focus();
  }, [collapsed]);

  const handleBodyFocusCapture: FocusEventHandler<HTMLDivElement> = (event) => {
    // Track committed ownership so concurrent renders don't snapshot stale activeElement values.
    bodyOwnsFocusRef.current = event.currentTarget.contains(event.target as Node);
  };
  const handleBodyBlurCapture: FocusEventHandler<HTMLDivElement> = (event) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus == null || event.currentTarget.contains(nextFocus)) {
      return;
    }
    bodyOwnsFocusRef.current = false;
  };

  const ancestorInactive = useContext(NodeInactiveContext);
  const showHandles = handles || inputSlot != null || outputSlot != null;
  const showInput = showHandles && showInputHandle;
  const isVertical = handleAxis === 'vertical';
  const compensatedTop = handleTop === undefined ? undefined : handleTop - STROKE_WIDTH_THIN;
  const compensatedLeft = handleLeft === undefined ? undefined : handleLeft - STROKE_WIDTH_THIN;
  // NodeFrame receives outer-edge offsets from hosts; compensating once for the border keeps ports aligned without host math.
  const handleStyle = isVertical
    ? compensatedLeft === undefined
      ? undefined
      : { left: compensatedLeft }
    : compensatedTop === undefined
      ? undefined
      : { top: compensatedTop };
  const frameStrings = strings.frame ?? defaultNodeFrameStrings;
  const actionCountLabel =
    countLabel !== undefined
      ? formatNodeFrameCount(frameStrings, countLabel)
      : actionCount === undefined
        ? undefined
        : frameStrings.actionCount(actionCount);
  const countId = useId();
  // Hosts usually aria-label the frame, which would hide the visible count from assistive tech; describe it instead.
  const describedBy =
    actionCountLabel === undefined ? rest['aria-describedby'] : [rest['aria-describedby'], countId].filter(Boolean).join(' ');
  const reveal = useCollapseReveal({
    enabled: motion === 'reveal',
    expanded: !collapsed,
    collapsedHeight: 0,
    motionRoot: () => rootRef.current,
    measureFull: () => {
      const body = bodyRef.current;
      if (!body) {
        return 0;
      }
      const previousMaxHeight = body.style.maxHeight;
      const previousMinHeight = body.style.minHeight;
      const previousOverflow = body.style.overflow;
      const previousDisplay = body.style.display;
      // A settled closed body uses display:none. Reveal must measure its full box before unhiding it.
      body.style.display = 'flex';
      body.style.maxHeight = 'none';
      body.style.minHeight = '0';
      body.style.overflow = 'visible';
      const fullHeight = body.scrollHeight;
      body.style.maxHeight = previousMaxHeight;
      body.style.minHeight = previousMinHeight;
      body.style.overflow = previousOverflow;
      body.style.display = previousDisplay;
      return fullHeight;
    },
    apply: (visible) => {
      const body = bodyRef.current;
      if (!body) {
        return;
      }
      // Height belongs exclusively to this hook; React inline styles would erase its opening frame.
      body.style.maxHeight = `${Math.max(visible, 0)}px`;
      body.style.minHeight = '0';
      body.style.overflow = 'hidden';
    },
    clear: () => {
      const body = bodyRef.current;
      if (!body) {
        return;
      }
      body.style.maxHeight = '';
      body.style.minHeight = '';
      body.style.overflow = '';
    },
  });
  const revealHidden = motion === 'reveal' && reveal.hidden;
  const bodyTextHeader = kind === 'branch' || headerAppearance === 'plain';
  const glyph = headerAppearance === 'plain' ? null : KIND_GLYPHS[kind];
  const titleClassName = mergeClasses(styles.title, bodyTextHeader && styles.titleBodyText);
  const titleNode =
    actionCountLabel === undefined ? (
      <span className={titleClassName}>{title}</span>
    ) : (
      <span className={styles.titleRow}>
        <span className={titleClassName}>{title}</span>
        <span className={styles.actionCountDot} aria-hidden="true">
          ·
        </span>
        <span id={countId} className={styles.actionCount}>
          {actionCountLabel}
        </span>
      </span>
    );

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    if (revealHidden) {
      body.setAttribute('inert', '');
    } else {
      body.removeAttribute('inert');
    }
  }, [revealHidden]);

  return (
    <div
      {...rest}
      aria-describedby={describedBy}
      ref={(node) => {
        rootRef.current = node;
        setForwardedRef(ref, node);
      }}
      className={mergeClasses(
        styles.root,
        tone !== 'neutral' && styles[tone],
        selected && styles.selected,
        styles.focus,
        inactive && !ancestorInactive && styles.inactive,
        className
      )}
      data-node-card={KIND_DATA[kind]}
      data-selected={selected || undefined}
      data-status={status}
      data-handle-axis={isVertical ? handleAxis : undefined}
      data-collapsed={collapsed || undefined}
      data-inactive={inactive || undefined}
    >
      {/* Every slot (ports, badge, header action, body) inherits the frame's dim so shared children such as
          NodeMergePoint or a nested branch card skip their own opacity and 0.4 never compounds. */}
      <NodeInactiveContext.Provider value={inactive || ancestorInactive}>
        {showInput ? (
          <NodeHandle
            variant={inputVariant}
            hoverable={false}
            className={isVertical ? styles.inputHandleVertical : styles.inputHandle}
            style={handleStyle}
          >
            {inputSlot}
          </NodeHandle>
        ) : null}
        {showHandles ? (
          <NodeHandle className={isVertical ? styles.outputHandleVertical : styles.outputHandle} style={handleStyle}>
            {outputSlot}
          </NodeHandle>
        ) : null}
        {status ? (
          <NodeStatusBadge
            live={false}
            status={status}
            detail={statusDetail}
            label={statusLabel}
            aria-label={statusAriaLabel}
            strings={strings.status}
            className={mergeClasses(styles.badge, isVertical && styles.badgeVertical)}
            style={
              isVertical && showInput && compensatedLeft !== undefined
                ? { left: compensatedLeft + nodeMetrics.handle.size / 2 + nodeMetrics.badge.handleGap }
                : undefined
            }
          />
        ) : null}
        {title ? (
          <div
            className={mergeClasses(
              styles.header,
              bodyTextHeader && styles.headerBodyText,
              subtitle && subtitlePlacement === 'below' && styles.headerStacked
            )}
          >
            {glyph ? (
              <span className={styles.glyph} aria-hidden="true">
                {glyph}
              </span>
            ) : null}
            {subtitle && subtitlePlacement === 'below' ? (
              <span className={styles.titleStack}>
                {titleNode}
                <span className={styles.subtitleBelow} title={subtitle}>
                  {subtitle}
                </span>
              </span>
            ) : (
              <>
                {titleNode}
                {subtitle ? <span className={styles.subtitle}>· {subtitle}</span> : null}
              </>
            )}
            {action != null && action !== false ? (
              <span ref={actionRef} className={styles.action}>
                {action}
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          ref={bodyRef}
          onFocusCapture={handleBodyFocusCapture}
          onBlurCapture={handleBodyBlurCapture}
          className={mergeClasses(
            styles.body,
            !title && styles.headerless,
            // Settled reveal bodies leave layout/accessibility but never unmount their stateful descendants.
            ((motion === 'none' && collapsed) || revealHidden) && styles.collapsedBody,
            motion === 'reveal' && styles.bodyReveal,
            motion === 'reveal' && (reveal.open ? styles.bodyOpen : styles.bodyClosed)
          )}
          aria-hidden={revealHidden || undefined}
        >
          {children}
        </div>
      </NodeInactiveContext.Provider>
    </div>
  );
});
