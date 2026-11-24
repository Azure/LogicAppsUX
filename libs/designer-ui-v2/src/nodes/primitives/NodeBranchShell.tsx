import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { HTMLAttributes } from 'react';
import { nodeMetrics } from '../metrics';
import { NODE_BRANCH_ACTIONS_MAX_RESERVE_PX } from './NodeBranchActions';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    paddingInline: tokens.spacingHorizontalXXL,
    borderRadius: tokens.borderRadius2XLarge,
    color: tokens.colorNeutralForeground1,
  },
  success: { backgroundColor: tokens.colorStatusSuccessBackground1 },
  danger: { backgroundColor: tokens.colorStatusDangerBackground1 },
  neutral: { backgroundColor: tokens.colorNeutralBackground3 },
  info: { backgroundColor: tokens.colorPaletteBlueBackground2 },
  selected: { outline: `${tokens.strokeWidthThick} solid ${tokens.colorCompoundBrandStroke}`, outlineOffset: '-2px' },
  inactive: { opacity: nodeMetrics.inactiveOpacity },
  withActions: {
    paddingInlineEnd: `calc(${tokens.spacingHorizontalXXL} + ${NODE_BRANCH_ACTIONS_MAX_RESERVE_PX + nodeMetrics.toolsHeader + 8}px)`,
  },
});

export interface NodeBranchShellProps extends HTMLAttributes<HTMLDivElement> {
  tone: 'success' | 'danger' | 'neutral' | 'info';
  selected?: boolean;
  inactive?: boolean;
  ancestorInactive?: boolean;
  hasActions?: boolean;
}

/** Branch-header surface only. The host supplies lane identity, children, and graph commands. */
export function NodeBranchShell({ tone, selected, inactive, ancestorInactive, hasActions, className, ...props }: NodeBranchShellProps) {
  const styles = useStyles();
  return (
    <div
      {...props}
      className={mergeClasses(
        styles.root,
        hasActions && styles.withActions,
        styles[tone],
        selected && styles.selected,
        inactive && !ancestorInactive && styles.inactive,
        className
      )}
      data-inactive={inactive || undefined}
    />
  );
}
