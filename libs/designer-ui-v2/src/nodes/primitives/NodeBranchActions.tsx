import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { nodeMetrics } from '../metrics';

export interface NodeBranchActionItem {
  key: string;
  icon: ReactNode;
  ariaLabel: string;
  automationId?: string;
  hasPopup?: boolean;
  disabled?: boolean;
  onInvoke: (anchor: HTMLElement) => void;
}

// Reserve enough right-side header room for two compact actions (rename + overflow).
export const NODE_BRANCH_ACTIONS_MAX_RESERVE_PX = nodeMetrics.toolsHeader * 2 + 12;

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    insetInlineEnd: tokens.spacingHorizontalS,
    top: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
  },
  button: {
    width: `${nodeMetrics.toolsHeader}px`,
    height: `${nodeMetrics.toolsHeader}px`,
    minWidth: '0',
    padding: '0',
  },
  icon: {
    width: `${nodeMetrics.toolsActionIcon}px`,
    height: `${nodeMetrics.toolsActionIcon}px`,
    fontSize: `${nodeMetrics.toolsActionIcon}px`,
  },
});

export const NodeBranchActions = ({ items, className }: { items: readonly NodeBranchActionItem[]; className?: string }) => {
  const styles = useStyles();
  if (!items.length) {
    return null;
  }
  return (
    <div className={mergeClasses(styles.root, className)}>
      {items.map((item) => (
        <Button
          key={item.key}
          appearance="subtle"
          shape="circular"
          size="small"
          disabled={item.disabled}
          className={mergeClasses('nodrag', styles.button)}
          icon={{ className: styles.icon, children: item.icon }}
          aria-label={item.ariaLabel}
          aria-haspopup={item.hasPopup ? 'menu' : undefined}
          data-automation-id={item.automationId}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            item.onInvoke(event.currentTarget);
          }}
        />
      ))}
    </div>
  );
};
