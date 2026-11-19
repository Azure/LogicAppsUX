import { createContext, forwardRef, useContext } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { nodeCardVars } from '../../theme/tokens';
import type { NodeFrameCountUnit } from '../strings';
import { NodeCardStatusContext } from './NodeCard';
import { getNodeStatusIcon } from './NodeStatusBadge';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, flexGrow: 1, minWidth: 0 },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingInlineEnd: `var(${nodeCardVars.textEndReserve}, 0)`,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
  },
  // Opt-in two-line clamp; hosts size the card for the same line count so layout and DOM agree.
  titleTwoLines: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  },
  subtitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingInlineEnd: `var(${nodeCardVars.textEndReserve}, 0)`,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
  // The count shares the subtitle line so collapsed cards keep their measured height. The row is one line tall and
  // fills in reverse visual order (count first), so when "subtitle · count" does not fit, the whole subtitle group
  // wraps onto the clipped second line instead of ellipsizing to an unreadable stub. DOM order stays subtitle, count.
  detailRow: {
    display: 'flex',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    minWidth: 0,
    height: tokens.lineHeightBase200,
    overflow: 'hidden',
    paddingInlineEnd: `var(${nodeCardVars.textEndReserve}, 0)`,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
  detailSubtitle: { display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap', maxWidth: '100%' },
  detailSubtitleText: { overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 },
  // Status rows never wrap: the glyph and duration stay readable while the status label (and count when needed)
  // shrink independently with ellipses.
  statusRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    minWidth: 0,
    paddingInlineEnd: `var(${nodeCardVars.textEndReserve}, 0)`,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
    gap: tokens.spacingHorizontalXXS,
  },
  statusGroup: { display: 'inline-flex', alignItems: 'center', minWidth: 0, flexGrow: 1, gap: tokens.spacingHorizontalXXS },
  statusIcon: { fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center' },
  statusLabel: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusDuration: { flexShrink: 0, whiteSpace: 'nowrap', unicodeBidi: 'isolate' },
  statusSeparator: { flexShrink: 0 },
  statusCount: { flexShrink: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  countDot: { flexShrink: 0, marginInline: tokens.spacingHorizontalXS },
  // Shrinks with an ellipsis only when the count alone is wider than the card (long localized units); the full
  // text stays available through `title` and the root's aria-describedby.
  count: { order: -1, flexShrink: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
});
export interface NodeTextProps extends HTMLAttributes<HTMLSpanElement> {
  title: string;
  subtitle?: string;
  subtitleKind?: 'default' | 'status';
  /** Maximum title lines; defaults to a single ellipsized line. */
  titleLines?: 1 | 2;
  /** Preformatted count (for example "3 actions") shown after the subtitle on collapsed container cards. */
  count?: string;
  countUnit?: NodeFrameCountUnit;
  /** Id for the count span so the card root can reference it with `aria-describedby`. */
  countId?: string;
}
export const NodeHoverCardActiveContext = createContext(false);
export const NodeText = forwardRef<HTMLSpanElement, NodeTextProps>(function NodeText(
  { title, subtitle, subtitleKind = 'default', titleLines = 1, count, countUnit, countId, className, ...rest },
  ref
) {
  const styles = useStyles();
  const hover = useContext(NodeHoverCardActiveContext);
  const statusContext = useContext(NodeCardStatusContext);
  const statusSubtitle = subtitleKind === 'status' && statusContext.status ? statusContext : undefined;
  const statusTitle = statusSubtitle ? [statusSubtitle.statusLabel, statusSubtitle.statusDetail].filter(Boolean).join(' ') : undefined;
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, className)}>
      <span className={mergeClasses(styles.title, titleLines === 2 && styles.titleTwoLines)} title={hover ? undefined : title}>
        {title}
      </span>
      {count && statusSubtitle ? (
        <span className={styles.statusRow}>
          <span className={styles.statusGroup} data-node-subtitle-kind="status" title={hover ? undefined : statusTitle}>
            <span className={styles.statusIcon}>{getNodeStatusIcon(statusSubtitle.status, styles.statusIcon)}</span>
            <span className={styles.statusLabel}>{statusSubtitle.statusLabel}</span>
            {statusSubtitle.statusDetail ? <bdi className={styles.statusDuration}>{statusSubtitle.statusDetail}</bdi> : null}
          </span>
          <span className={styles.statusSeparator} aria-hidden="true">
            ·
          </span>
          {/* The hover card repeats title/subtitle but not the count, so the count keeps its native tooltip even inside a hover card. */}
          <span id={countId} className={styles.statusCount} data-node-count={countUnit ?? true} title={count}>
            {count}
          </span>
        </span>
      ) : count ? (
        <span className={styles.detailRow}>
          {subtitle ? (
            <span
              className={styles.detailSubtitle}
              data-node-subtitle-kind={subtitleKind === 'status' ? subtitleKind : undefined}
              title={hover ? undefined : subtitle}
            >
              <span className={styles.detailSubtitleText}>{subtitle}</span>
              <span className={styles.countDot} aria-hidden="true">
                ·
              </span>
            </span>
          ) : null}
          {/* The hover card repeats title/subtitle but not the count, so the count keeps its native tooltip even inside a hover card. */}
          <span id={countId} className={styles.count} data-node-count={countUnit ?? true} title={count}>
            {count}
          </span>
        </span>
      ) : statusSubtitle ? (
        <span className={styles.statusRow}>
          <span className={styles.statusGroup} data-node-subtitle-kind="status" title={hover ? undefined : statusTitle}>
            <span className={styles.statusIcon}>{getNodeStatusIcon(statusSubtitle.status, styles.statusIcon)}</span>
            <span className={styles.statusLabel}>{statusSubtitle.statusLabel}</span>
            {statusSubtitle.statusDetail ? <bdi className={styles.statusDuration}>{statusSubtitle.statusDetail}</bdi> : null}
          </span>
        </span>
      ) : subtitle ? (
        <span
          className={styles.subtitle}
          data-node-subtitle-kind={subtitleKind === 'status' ? subtitleKind : undefined}
          title={hover ? undefined : subtitle}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
});
export const joinNodeSubtitle = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ');
