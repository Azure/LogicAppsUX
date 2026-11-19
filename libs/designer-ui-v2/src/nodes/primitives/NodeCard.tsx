import { createContext, forwardRef, useContext, useMemo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens as ui, nodeCardVars } from '../../theme/tokens';
import { compactNodeMetrics, nodeMetrics } from '../metrics';
import { verticalBadgeLeft } from './badgePlacement';
import type { ActionNodeCardStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import type { NodeCardShape, NodeCardWidth, NodeRunStatus, NodeStatusDisplay, NodeStatusTint, NodeStatusTone } from '../types';
import { NodeHandleAxisContext, NodeInactiveContext } from './NodeHandle';
import type { NodeHandleAxis } from './NodeHandle';
import { NodeStatusBadge } from './NodeStatusBadge';

const bg = nodeCardVars.background;
const footerBg = nodeCardVars.footerBackground;
const useStyles = makeStyles({
  root: { position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' },
  compact: { width: `${nodeMetrics.cards.condition.width}px` },
  standardCompact: { width: `${compactNodeMetrics.card.width}px` },
  standard: { width: `${nodeMetrics.cards.action.width}px` },
  wide: { width: `${nodeMetrics.cards.agent.width}px` },
  fill: { width: '100%' },
  card: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    border: `${tokens.strokeWidthThin} solid ${ui.nodeBorder}`,
    borderRadius: tokens.borderRadius2XLarge,
    backgroundColor: `var(${bg})`,
    color: tokens.colorNeutralForeground1,
    transitionProperty: 'background-color, border-color, box-shadow',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
    '&:is([data-reduce-motion="true"] *)': { transitionDuration: '0.01ms' },
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  medium: { minHeight: `${nodeMetrics.cards.action.height}px` },
  small: { minHeight: `${nodeMetrics.cards.tool.smallHeight}px` },
  switch: { minHeight: `${nodeMetrics.cards.switch.height}px`, ...shorthands.borderWidth(`${nodeMetrics.cards.switch.borderWidth}px`) },
  compactHeight: { minHeight: `${compactNodeMetrics.card.height}px` },
  compactWrappedHeight: { minHeight: `${compactNodeMetrics.card.wrappedHeight}px` },
  pill: {
    borderTopLeftRadius: `${nodeMetrics.cards.trigger.height / 2}px`,
    borderBottomLeftRadius: `${nodeMetrics.cards.trigger.height / 2}px`,
  },
  // Compact pills keep a half-height radius so the left edge stays a true semicircle.
  pillCompact: {
    borderTopLeftRadius: `${compactNodeMetrics.card.height / 2}px`,
    borderBottomLeftRadius: `${compactNodeMetrics.card.height / 2}px`,
  },
  pillCompactWrapped: {
    borderTopLeftRadius: `${compactNodeMetrics.card.wrappedHeight / 2}px`,
    borderBottomLeftRadius: `${compactNodeMetrics.card.wrappedHeight / 2}px`,
  },
  neutral: { [bg]: ui.nodeSurface, ':hover': { [bg]: ui.nodeSurfaceHover } },
  neutralSelected: { [bg]: ui.nodeSurfaceSelected, ':hover': { [bg]: ui.nodeSurfaceSelected } },
  agent: {
    [bg]: ui.nodeAgentSurface,
    [footerBg]: tokens.colorNeutralBackground3,
    ':hover': { [bg]: ui.nodeAgentSurfaceHover, [footerBg]: tokens.colorNeutralBackground3Hover },
  },
  agentSelected: {
    [bg]: ui.nodeAgentSurfaceSelected,
    [footerBg]: tokens.colorNeutralBackground3Pressed,
    ':hover': { [bg]: ui.nodeAgentSurfaceSelected, [footerBg]: tokens.colorNeutralBackground3Pressed },
  },
  // Content draws the exact dashed outline; the CSS border is the forced-colors fallback.
  placeholder: {
    ...shorthands.borderStyle('dashed'),
    ...shorthands.borderColor('transparent'),
    [bg]: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    ':hover': { [bg]: tokens.colorNeutralBackground2Hover },
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  selected: {
    ...shorthands.borderColor(ui.nodeBorderSelected),
    outline: `${tokens.strokeWidthThin} solid ${ui.nodeBorderSelected}`,
    outlineOffset: '-2px',
    '@media (forced-colors: active)': { ...shorthands.borderColor('Highlight'), outlineColor: 'Highlight' },
  },
  focus: { ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' } },
  badge: { position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 },
  // Vertical-axis cards centre their input handle on the top edge. The badge starts past that handle and grows away
  // from it, so no label length can cover the handle (right anchoring grew labels leftward across the centreline).
  badgeVertical: {
    left: verticalBadgeLeft,
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
  },
  statusPerimeter: {
    position: 'absolute',
    inset: '3px',
    boxSizing: 'border-box',
    borderRadius: 'inherit',
    ...shorthands.border('2px', 'solid', 'transparent'),
    pointerEvents: 'none',
    zIndex: 1,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  perimeterSuccess: { ...shorthands.borderColor(tokens.colorStatusSuccessBorder2) },
  perimeterDanger: { ...shorthands.borderColor(tokens.colorStatusDangerBorder2) },
  perimeterWarning: { ...shorthands.borderColor(tokens.colorStatusWarningBorder2) },
  perimeterRunning: { ...shorthands.borderColor(tokens.colorBrandStroke1) },
  perimeterSkipped: { ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible) },
  perimeterNeutral: { ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible) },
  // Real failed runs get a subtle attention tint; warning/error states keep their neutral fill.
  statusTintFailed: { [bg]: tokens.colorStatusDangerBackground1, ':hover': { [bg]: tokens.colorStatusDangerBackground1 } },
  // Dimming only: inactive nodes stay focusable, hoverable and inspectable.
  inactive: { opacity: nodeMetrics.inactiveOpacity },
});

const statusToneByStatus: Record<NodeRunStatus, NodeStatusTone> = {
  pending: 'neutral',
  running: 'running',
  succeeded: 'success',
  skipped: 'skipped',
  failed: 'danger',
  error: 'danger',
  warning: 'warning',
  cancelled: 'warning',
  mock: 'neutral',
};
export interface NodeCardProps extends HTMLAttributes<HTMLDivElement> {
  width?: NodeCardWidth;
  size?: 'medium' | 'small' | 'switch' | 'compact' | 'compactWrapped';
  bodyHeight?: number;
  shape?: NodeCardShape;
  surface?: 'neutral' | 'agent';
  appearance?: 'default' | 'placeholder';
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
  /** Edge badge by default; contained uses the subtitle line plus inset perimeter. */
  statusDisplay?: NodeStatusDisplay;
  /** Optional perimeter override for host states that collapse onto a shared status tone. */
  statusTone?: NodeStatusTone;
  /** Optional subtle status fill. Only failed cards should opt into this. */
  statusTint?: NodeStatusTint;
  /** Visible badge text override for service states that share a tone. */
  statusLabel?: string;
  /** Accessible name for the badge when it differs from the visible text. */
  statusAriaLabel?: string;
  /** Dims a node that did not run on the selected path; it remains interactive. */
  inactive?: boolean;
  strings?: ActionNodeCardStrings;
  after?: ReactNode;
  handleAxis?: NodeHandleAxis;
}
interface NodeCardStatusContextValue {
  status: NodeRunStatus;
  statusLabel: string;
  statusDetail?: string;
}
export const NodeCardStatusContext = createContext<NodeCardStatusContextValue | undefined>(undefined);
export const NodeCard = forwardRef<HTMLDivElement, NodeCardProps>(function NodeCard(
  {
    width = 'standard',
    size = 'medium',
    bodyHeight,
    shape = 'rounded',
    surface = 'neutral',
    appearance = 'default',
    selected = false,
    status,
    statusDetail,
    statusDisplay = 'badge',
    statusTone,
    statusTint = 'none',
    statusLabel,
    statusAriaLabel,
    inactive = false,
    strings = defaultNodeStrings,
    after,
    handleAxis = 'horizontal',
    className,
    children,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const ancestorInactive = useContext(NodeInactiveContext);
  const dimmed = inactive || ancestorInactive;
  const containedStatus = statusDisplay === 'contained' && !!status && status !== 'mock';
  const statusContext = useMemo<NodeCardStatusContextValue | undefined>(
    () =>
      containedStatus && status
        ? {
            status,
            statusLabel: statusLabel ?? strings.status[status],
            statusDetail,
          }
        : undefined,
    [containedStatus, status, statusDetail, statusLabel, strings.status]
  );
  const resolvedStatusTone = containedStatus ? (statusTone ?? statusToneByStatus[status]) : undefined;
  const perimeterClass =
    resolvedStatusTone === 'success'
      ? styles.perimeterSuccess
      : resolvedStatusTone === 'danger'
        ? styles.perimeterDanger
        : resolvedStatusTone === 'warning'
          ? styles.perimeterWarning
          : resolvedStatusTone === 'running'
            ? styles.perimeterRunning
            : resolvedStatusTone === 'skipped'
              ? styles.perimeterSkipped
              : resolvedStatusTone === 'neutral'
                ? styles.perimeterNeutral
                : undefined;
  return (
    <div
      role="group"
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, styles[width], styles.focus, inactive && !ancestorInactive && styles.inactive, className)}
      data-selected={selected || undefined}
      data-status={status}
      data-status-display={containedStatus ? 'contained' : status ? 'badge' : undefined}
      data-status-tone={resolvedStatusTone}
      data-status-tint={containedStatus && statusTint !== 'none' ? statusTint : undefined}
      data-handle-axis={handleAxis}
      data-inactive={inactive || undefined}
    >
      {status && status !== 'mock' && !containedStatus ? (
        <NodeStatusBadge
          live={false}
          status={status}
          detail={statusDetail}
          label={statusLabel}
          aria-label={statusAriaLabel}
          strings={strings.status}
          className={mergeClasses(styles.badge, handleAxis === 'vertical' && styles.badgeVertical)}
        />
      ) : null}
      <div
        style={bodyHeight === undefined ? undefined : { minHeight: bodyHeight }}
        className={mergeClasses(
          styles.card,
          size === 'compact' ? styles.compactHeight : size === 'compactWrapped' ? styles.compactWrappedHeight : styles[size],
          styles[surface],
          selected && (surface === 'agent' ? styles.agentSelected : styles.neutralSelected),
          shape === 'pill' &&
            (size === 'compact' ? styles.pillCompact : size === 'compactWrapped' ? styles.pillCompactWrapped : styles.pill),
          appearance === 'placeholder' && styles.placeholder,
          containedStatus && statusTint === 'failed' && styles.statusTintFailed,
          selected && styles.selected
        )}
      >
        {containedStatus && perimeterClass ? (
          <span
            aria-hidden="true"
            data-node-status-perimeter
            className={mergeClasses(styles.statusPerimeter, perimeterClass)}
            style={{
              borderRadius:
                shape === 'pill'
                  ? `${Math.max(
                      0,
                      (size === 'compact'
                        ? compactNodeMetrics.card.height
                        : size === 'compactWrapped'
                          ? compactNodeMetrics.card.wrappedHeight
                          : nodeMetrics.cards.trigger.height) /
                        2 -
                        3
                    )}px`
                  : `calc(${tokens.borderRadius2XLarge} - 3px)`,
            }}
          />
        ) : null}
        <NodeCardStatusContext.Provider value={statusContext}>
          <NodeInactiveContext.Provider value={dimmed}>
            <NodeHandleAxisContext.Provider value={handleAxis}>{children}</NodeHandleAxisContext.Provider>
          </NodeInactiveContext.Provider>
        </NodeCardStatusContext.Provider>
      </div>
      <NodeCardStatusContext.Provider value={statusContext}>
        <NodeInactiveContext.Provider value={dimmed}>
          <NodeHandleAxisContext.Provider value={handleAxis}>{after}</NodeHandleAxisContext.Provider>
        </NodeInactiveContext.Provider>
      </NodeCardStatusContext.Provider>
    </div>
  );
});
