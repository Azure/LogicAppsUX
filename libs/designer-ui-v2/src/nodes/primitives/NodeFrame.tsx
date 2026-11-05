import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ArrowRepeatAllRegular, ArrowTurnRightRegular, BoxMultipleRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeRunStatus } from '../types';
import type { ActionNodeCardStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { NodeStatusBadge } from './NodeStatusBadge';
import { NodeHandle } from './NodeHandle';
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
  headerBranch: {
    minHeight: '24px',
    paddingInline: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  titleBranch: { fontWeight: tokens.fontWeightRegular },
  glyph: {
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorPaletteLilacForeground2,
    '@media (forced-colors: active)': { color: 'CanvasText' },
  },
  title: { fontWeight: tokens.fontWeightSemibold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
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
  headerless: { paddingTop: tokens.spacingVerticalL },
  collapsedBody: { display: 'none' },
  inputHandle: { position: 'absolute', top: '50%', left: `${nodeMetrics.handle.edgeOffset}px`, transform: 'translateY(-50%)' },
  outputHandle: { position: 'absolute', top: '50%', right: `${nodeMetrics.handle.edgeOffset}px`, transform: 'translateY(-50%)' },
  inputHandleVertical: { position: 'absolute', top: `${nodeMetrics.handle.edgeOffset}px`, left: '50%', transform: 'translateX(-50%)' },
  outputHandleVertical: { position: 'absolute', bottom: `${nodeMetrics.handle.edgeOffset}px`, left: '50%', transform: 'translateX(-50%)' },
  badge: { position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 },
  badgeVertical: { left: 'auto', right: tokens.spacingHorizontalL, transform: 'translateY(-50%)' },
  focus: { ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' } },
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
  /** Inline by default; below stacks a caption under the title. */
  subtitlePlacement?: 'inline' | 'below';
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
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
  strings?: ActionNodeCardStrings;
}

/** Canonical translucent scope/loop/branch frame; host computes bounds and topology. */
export const NodeFrame = forwardRef<HTMLDivElement, NodeFrameProps>(function NodeFrame(
  {
    kind,
    tone = 'neutral',
    collapsed = false,
    title,
    subtitle,
    subtitlePlacement = 'inline',
    selected = false,
    status,
    statusDetail,
    action,
    children,
    handles = false,
    inputSlot,
    outputSlot,
    handleTop,
    handleAxis = 'horizontal',
    handleLeft,
    strings = defaultNodeStrings,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const showHandles = handles || inputSlot != null || outputSlot != null;
  const isVertical = handleAxis === 'vertical';
  const handleStyle = isVertical
    ? handleLeft === undefined
      ? undefined
      : { left: handleLeft }
    : handleTop === undefined
      ? undefined
      : { top: handleTop };
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, tone !== 'neutral' && styles[tone], selected && styles.selected, styles.focus, className)}
      data-node-card={KIND_DATA[kind]}
      data-selected={selected || undefined}
      data-status={status}
      data-handle-axis={isVertical ? handleAxis : undefined}
      data-collapsed={collapsed || undefined}
    >
      {showHandles ? (
        <NodeHandle className={isVertical ? styles.inputHandleVertical : styles.inputHandle} style={handleStyle}>
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
          status={status}
          detail={statusDetail}
          strings={strings.status}
          className={mergeClasses(styles.badge, isVertical && styles.badgeVertical)}
        />
      ) : null}
      {title ? (
        <div
          className={mergeClasses(
            styles.header,
            kind === 'branch' && styles.headerBranch,
            subtitle && subtitlePlacement === 'below' && styles.headerStacked
          )}
        >
          {KIND_GLYPHS[kind] ? (
            <span className={styles.glyph} aria-hidden="true">
              {KIND_GLYPHS[kind]}
            </span>
          ) : null}
          {subtitle && subtitlePlacement === 'below' ? (
            <span className={styles.titleStack}>
              <span className={mergeClasses(styles.title, kind === 'branch' && styles.titleBranch)}>{title}</span>
              <span className={styles.subtitleBelow} title={subtitle}>
                {subtitle}
              </span>
            </span>
          ) : (
            <>
              <span className={mergeClasses(styles.title, kind === 'branch' && styles.titleBranch)}>{title}</span>
              {subtitle ? <span className={styles.subtitle}>· {subtitle}</span> : null}
            </>
          )}
          {action != null ? <span className={styles.action}>{action}</span> : null}
        </div>
      ) : null}
      <div className={mergeClasses(styles.body, !title && styles.headerless, collapsed && styles.collapsedBody)}>{children}</div>
    </div>
  );
});
