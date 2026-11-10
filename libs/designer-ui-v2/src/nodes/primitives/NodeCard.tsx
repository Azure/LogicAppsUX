import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens as ui, nodeCardVars } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { ActionNodeCardStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import type { NodeCardShape, NodeCardWidth, NodeRunStatus } from '../types';
import { NodeHandleAxisContext } from './NodeHandle';
import type { NodeHandleAxis } from './NodeHandle';
import { NodeStatusBadge } from './NodeStatusBadge';

const bg = nodeCardVars.background;
const footerBg = nodeCardVars.footerBackground;
const useStyles = makeStyles({
  root: { position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' },
  compact: { width: `${nodeMetrics.cards.condition.width}px` },
  standard: { width: `${nodeMetrics.cards.action.width}px` },
  wide: { width: `${nodeMetrics.cards.agent.width}px` },
  fill: { width: '100%' },
  card: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
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
  switch: { minHeight: `${nodeMetrics.cards.switch.height}px` },
  pill: {
    borderTopLeftRadius: `${nodeMetrics.cards.trigger.height / 2}px`,
    borderBottomLeftRadius: `${nodeMetrics.cards.trigger.height / 2}px`,
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
  badgeVertical: { left: 'auto', right: tokens.spacingHorizontalL, transform: 'translateY(-50%)' },
});
export interface NodeCardProps extends HTMLAttributes<HTMLDivElement> {
  width?: NodeCardWidth;
  size?: 'medium' | 'small' | 'switch';
  shape?: NodeCardShape;
  surface?: 'neutral' | 'agent';
  appearance?: 'default' | 'placeholder';
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
  strings?: ActionNodeCardStrings;
  after?: ReactNode;
  handleAxis?: NodeHandleAxis;
}
export const NodeCard = forwardRef<HTMLDivElement, NodeCardProps>(function NodeCard(
  {
    width = 'standard',
    size = 'medium',
    shape = 'rounded',
    surface = 'neutral',
    appearance = 'default',
    selected = false,
    status,
    statusDetail,
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
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, styles[width], styles.focus, className)}
      data-selected={selected || undefined}
      data-status={status}
      data-handle-axis={handleAxis}
    >
      {status && status !== 'mock' ? (
        <NodeStatusBadge
          status={status}
          detail={statusDetail}
          strings={strings.status}
          className={mergeClasses(styles.badge, handleAxis === 'vertical' && styles.badgeVertical)}
        />
      ) : null}
      <div
        className={mergeClasses(
          styles.card,
          styles[size],
          styles[surface],
          selected && (surface === 'agent' ? styles.agentSelected : styles.neutralSelected),
          shape === 'pill' && styles.pill,
          appearance === 'placeholder' && styles.placeholder,
          selected && styles.selected
        )}
      >
        <NodeHandleAxisContext.Provider value={handleAxis}>{children}</NodeHandleAxisContext.Provider>
      </div>
      <NodeHandleAxisContext.Provider value={handleAxis}>{after}</NodeHandleAxisContext.Provider>
    </div>
  );
});
