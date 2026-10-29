import { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import { Badge, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { BadgeProps } from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  BeakerRegular,
  CheckmarkRegular,
  ClockRegular,
  DismissRegular,
  ErrorCircleRegular,
  SquareRegular,
  SubtractRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import type { NodeRunStatus } from '../types';
import type { NodeStatusStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { nodeMetrics } from '../metrics';
import { designerUiTokens } from '../../theme/tokens';

const icons: Record<NodeRunStatus, ReactElement> = {
  pending: <ClockRegular />,
  running: <ArrowSyncRegular />,
  succeeded: <CheckmarkRegular />,
  skipped: <SubtractRegular />,
  failed: <DismissRegular />,
  error: <ErrorCircleRegular />,
  warning: <WarningRegular />,
  cancelled: <SquareRegular />,
  mock: <BeakerRegular />,
};
const colors: Record<NodeRunStatus, NonNullable<BadgeProps['color']>> = {
  pending: 'informative',
  running: 'brand',
  succeeded: 'success',
  skipped: 'informative',
  failed: 'danger',
  error: 'danger',
  warning: 'warning',
  cancelled: 'severe',
  mock: 'informative',
};
const useStyles = makeStyles({
  root: { whiteSpace: 'nowrap' },
  mock: { backgroundColor: designerUiTokens.agentNativeBadgeBackground, color: designerUiTokens.agentNativeBadgeForeground },
  icon: { fontSize: `${nodeMetrics.badge.icon}px` },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: tokens.durationUltraSlow,
    animationTimingFunction: tokens.curveLinear,
    animationIterationCount: 'infinite',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
    '&:is([data-reduce-motion="true"] *)': { animationName: 'none' },
  },
});
export interface NodeStatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  status: NodeRunStatus;
  detail?: string;
  strings?: NodeStatusStrings;
}
export const getNodeStatusLabel = (status: NodeRunStatus, strings = defaultNodeStrings.status) => strings[status];
export const NodeStatusBadge = forwardRef<HTMLDivElement, NodeStatusBadgeProps>(function NodeStatusBadge(
  { status, detail, strings = defaultNodeStrings.status, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <Badge
      {...rest}
      ref={ref}
      appearance="tint"
      shape="circular"
      size="medium"
      color={colors[status]}
      className={mergeClasses(styles.root, status === 'mock' && styles.mock, className)}
      icon={{ children: icons[status], 'aria-hidden': true, className: mergeClasses(styles.icon, status === 'running' && styles.spin) }}
      role="status"
      data-badge-status={status}
    >
      {strings[status]}
      {detail ? <> {detail}</> : null}
    </Badge>
  );
});
