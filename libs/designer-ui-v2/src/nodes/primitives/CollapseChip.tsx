import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { nodeMetrics } from '../metrics';
import type { CollapseChipStrings } from '../strings';
import { defaultNodeStrings } from '../strings';

const useStyles = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    minWidth: 'auto',
    height: `${nodeMetrics.collapseChip.height}px`,
    padding: `0 ${tokens.spacingHorizontalXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover, ...shorthands.borderColor(tokens.colorNeutralStroke1) },
    '@media (forced-colors: active)': { ...shorthands.border(tokens.strokeWidthThin, 'solid', 'ButtonText') },
  },
  count: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '1',
    paddingRight: tokens.spacingHorizontalXXS,
  },
  icon: { fontSize: tokens.fontSizeBase300 },
});

export interface CollapseChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'children'> {
  collapsed: boolean;
  count: number;
  onToggle: (nextCollapsed: boolean) => void;
  nounSingular?: string;
  nounPlural?: string;
  strings?: CollapseChipStrings;
}

/** Canonical count/chevron chip; the host retains collapse state and child identities. */
export const CollapseChip = forwardRef<HTMLButtonElement, CollapseChipProps>(function CollapseChip(
  {
    collapsed,
    count,
    onToggle,
    nounSingular,
    nounPlural,
    strings = defaultNodeStrings.collapse,
    className,
    'aria-label': ariaLabel,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const noun = count === 1 ? (nounSingular ?? strings.nounSingular) : (nounPlural ?? strings.nounPlural);
  const displayCount = count > nodeMetrics.collapseChip.maxVisibleCount ? `${nodeMetrics.collapseChip.maxVisibleCount}+` : String(count);
  const label = ariaLabel ?? (collapsed ? strings.show(count, noun) : strings.hide(count, noun));
  return (
    <Button
      {...rest}
      ref={ref}
      type="button"
      shape="circular"
      appearance="subtle"
      className={mergeClasses(styles.chip, 'nodrag', className)}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(!collapsed);
      }}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
    >
      {collapsed && <span className={styles.count}>{displayCount}</span>}
      {collapsed ? (
        <ChevronRightRegular className={styles.icon} aria-hidden="true" />
      ) : (
        <ChevronDownRegular className={styles.icon} aria-hidden="true" />
      )}
    </Button>
  );
});
