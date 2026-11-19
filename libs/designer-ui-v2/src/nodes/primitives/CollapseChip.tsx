import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { compactNodeMetrics, nodeMetrics } from '../metrics';
import type { CollapseChipStrings, NodeFrameStrings } from '../strings';
import { defaultNodeFrameStrings, defaultNodeStrings } from '../strings';
import { formatFrameCount, type NodeFrameCountLabel } from '../frameCount';

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
  summary: {
    boxSizing: 'border-box',
    width: `${compactNodeMetrics.card.width}px`,
    height: `${compactNodeMetrics.card.wrappedHeight}px`,
    gap: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadius2XLarge,
    paddingInline: tokens.spacingHorizontalM,
  },
  summaryText: {
    minWidth: 0,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalXXS,
    textAlign: 'start',
  },
  summaryTitle: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  summaryDetails: { minWidth: 0, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  summaryCount: {
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  thumbnail: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '14px',
    '& > img': { width: '14px', height: '14px', objectFit: 'contain' },
  },
  summaryIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusMedium,
    fontSize: '22px',
    '& > img': { width: '22px', height: '22px' },
  },
});

export interface CollapseChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'children'> {
  collapsed: boolean;
  count: number;
  onToggle: (nextCollapsed: boolean) => void;
  nounSingular?: string;
  nounPlural?: string;
  strings?: CollapseChipStrings;
  /** Opt-in compact summary while collapsed; ordinary chips (and expanded controls) are unchanged. */
  summary?: {
    title: string;
    icon?: ReactNode;
    thumbnails?: readonly { id: string; icon: ReactNode }[];
    countLabel: NodeFrameCountLabel;
    strings?: NodeFrameStrings;
  };
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
    summary,
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
  const details = collapsed ? summary : undefined;
  return (
    <Button
      {...rest}
      ref={ref}
      type="button"
      shape={details ? 'rounded' : 'circular'}
      appearance="subtle"
      className={mergeClasses(styles.chip, details && styles.summary, 'nodrag', className)}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(!collapsed);
      }}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
    >
      {details ? (
        <>
          {details.icon ? (
            <span className={mergeClasses(styles.thumbnail, styles.summaryIcon)} aria-hidden="true">
              {details.icon}
            </span>
          ) : null}
          <span className={styles.summaryText}>
            <span className={styles.summaryTitle}>{details.title}</span>
            <span className={styles.summaryDetails}>
              <span className={styles.summaryCount}>
                {formatFrameCount(details.strings ?? defaultNodeFrameStrings, details.countLabel)}
              </span>
              {details.thumbnails?.slice(0, 3).map(({ id, icon }) => (
                <span key={id} className={styles.thumbnail} aria-hidden="true" data-summary-thumbnail>
                  {icon}
                </span>
              ))}
            </span>
          </span>
        </>
      ) : (
        collapsed && <span className={styles.count}>{displayCount}</span>
      )}
      {collapsed ? (
        <ChevronRightRegular className={styles.icon} aria-hidden="true" />
      ) : (
        <ChevronDownRegular className={styles.icon} aria-hidden="true" />
      )}
    </Button>
  );
});
