import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, Link, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { BeakerRegular, CheckmarkCircle12Regular, DismissRegular, OpenRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { nodeMetrics } from '../metrics';
import type { NodeInfoCardStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import type { NodeCategory } from '../types';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
export const toSafeExternalHref = (href: string | undefined) => {
  if (!href) {
    return undefined;
  }
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};
const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    width: `${nodeMetrics.hoverCard.width}px`,
    maxWidth: '100%',
    paddingTop: `calc(${tokens.spacingVerticalM} - ${tokens.strokeWidthThin})`,
    paddingRight: `calc(${tokens.spacingHorizontalM} - ${tokens.strokeWidthThin})`,
    paddingBottom: `calc(${tokens.spacingVerticalM} + ${tokens.spacingHorizontalS} - ${tokens.strokeWidthThin})`,
    paddingLeft: `calc(${tokens.spacingVerticalM} - ${tokens.strokeWidthThin})`,
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
    // Explicit presentation replaces internal Card defaults, not its implementation.
    boxShadow: 'none',
    border: `${tokens.strokeWidthThin} solid transparent`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    '::before': { display: 'none' },
    '::after': { display: 'none' },
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText') },
  },
  title: {
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
  },
  wrappedTitle: { whiteSpace: 'normal', overflowWrap: 'anywhere' },
  header: {
    gridTemplateColumns: 'min-content minmax(0, 1fr) auto',
    '& .fui-CardHeader__header, & .fui-CardHeader__description': { minWidth: 0 },
    '& .fui-CardHeader__action': { alignSelf: 'flex-start' },
  },
  subtext: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    flexGrow: 1,
    minWidth: 0,
    contain: 'inline-size',
    marginRight: `calc(-1 * (${nodeMetrics.hoverCard.dismiss}px + ${tokens.spacingHorizontalM}))`,
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
  },
  subtitle: { flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' },
  configured: {
    flexShrink: 0,
    marginBlock: `calc((${tokens.lineHeightBase200} - ${nodeMetrics.badge.height}px) / 2)`,
    paddingInline: tokens.spacingHorizontalXS,
  },
  testData: {
    color: designerUiTokens.nodeTestDataForeground,
    '@media (forced-colors: active)': { color: 'CanvasText' },
  },
  actions: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS },
  // 24px border-box hit target around a 16px glyph; the negative margin keeps the glyph aligned with the header.
  dismiss: {
    alignSelf: 'flex-start',
    boxSizing: 'border-box',
    minWidth: `${nodeMetrics.hoverCard.dismissHitSize}px`,
    width: `${nodeMetrics.hoverCard.dismissHitSize}px`,
    height: `${nodeMetrics.hoverCard.dismissHitSize}px`,
    padding: 0,
    margin: `${(nodeMetrics.hoverCard.dismiss - nodeMetrics.hoverCard.dismissHitSize) / 2}px`,
    fontSize: `${nodeMetrics.hoverCard.dismiss}px`,
    color: tokens.colorNeutralForeground3,
    '&.fui-Button, &.fui-Button[data-fui-focus-visible]': { borderRadius: tokens.borderRadiusSmall },
  },
  description: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
  // Kept outside the two-line clamp so host controls (for example Edit test data) are never cut off.
  footer: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
  link: { fontSize: 'inherit', lineHeight: 'inherit' },
  linkIcon: { verticalAlign: '-1px', marginLeft: tokens.spacingHorizontalXS, fontSize: tokens.fontSizeBase200 },
  tileIcon: { fontSize: `${nodeMetrics.tile.mediumIcon}px` },
});
export interface NodeInfoCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  category: NodeCategory;
  icon: ReactNode;
  title: string;
  /** Allow the full title to wrap rather than relying on a mouse-only native tooltip. */
  wrapTitle?: boolean;
  subtitle?: string;
  configured?: boolean;
  description?: ReactNode;
  learnMoreHref?: string;
  onDismiss?: () => void;
  actions?: ReactNode;
  strings?: NodeInfoCardStrings;
  /**
   * Output test data is substituted for this action. Presence (even `{}`) replaces the Configured confirmation and the
   * ordinary description. Hosts must not pass it for a trigger's saved sample input.
   */
  testData?: { description?: string };
  /** Host slot rendered below the description, outside its clamp. */
  footer?: ReactNode;
}
export const NodeInfoCard = forwardRef<HTMLDivElement, NodeInfoCardProps>(function NodeInfoCard(
  {
    category,
    icon,
    title,
    wrapTitle,
    subtitle,
    configured,
    description,
    learnMoreHref,
    onDismiss,
    actions,
    strings = defaultNodeStrings.info,
    testData,
    footer,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const resolvedIcon = resolveNodeIcons({ icon }, categoryNodeIcons[category]).icon;
  const safeHref = toSafeExternalHref(learnMoreHref);
  const isTestData = testData !== undefined;
  const showConfigured = !!configured && !isTestData;
  // `??` keeps an explicit empty string from a host or translation instead of falling back to English.
  const effectiveDescription = isTestData
    ? (testData.description ?? strings.testDataDescription ?? defaultNodeStrings.info.testDataDescription)
    : description;
  const hasDescription = effectiveDescription != null && effectiveDescription !== false && effectiveDescription !== '';
  const hasFooter = footer != null && footer !== false && footer !== '';
  return (
    <Card
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, className)}
      appearance="filled-alternative"
      size="medium"
      data-node-info-card={category}
    >
      <CardHeader
        className={styles.header}
        image={
          <NodeIconTile
            category={category}
            icon={<span className={styles.tileIcon}>{resolvedIcon}</span>}
            size="small"
            bordered={isTestData}
            testData={isTestData}
          />
        }
        header={
          <h3 className={mergeClasses(styles.title, wrapTitle && styles.wrappedTitle)} title={title}>
            {title}
          </h3>
        }
        description={
          subtitle || showConfigured || isTestData ? (
            <div className={styles.subtext}>
              {subtitle ? (
                <span className={styles.subtitle} title={subtitle}>
                  {subtitle}
                </span>
              ) : null}
              {subtitle && showConfigured ? <span aria-hidden="true">·</span> : null}
              {isTestData ? (
                <Badge
                  className={mergeClasses(styles.configured, styles.testData)}
                  appearance="ghost"
                  size="medium"
                  shape="circular"
                  icon={<BeakerRegular aria-hidden="true" />}
                  data-node-info-test-data=""
                >
                  {strings.testData ?? defaultNodeStrings.info.testData}
                </Badge>
              ) : null}
              {showConfigured ? (
                <Badge
                  className={styles.configured}
                  appearance="ghost"
                  color="success"
                  size="medium"
                  shape="circular"
                  icon={<CheckmarkCircle12Regular aria-hidden="true" />}
                >
                  {strings.configured}
                </Badge>
              ) : null}
            </div>
          ) : null
        }
        action={
          actions || onDismiss ? (
            <div className={styles.actions}>
              {actions}
              {onDismiss ? (
                <Button
                  shape="circular"
                  className={styles.dismiss}
                  appearance="transparent"
                  icon={<DismissRegular />}
                  aria-label={strings.close}
                  onClick={onDismiss}
                />
              ) : null}
            </div>
          ) : null
        }
      />
      {hasDescription || safeHref ? (
        <div className={styles.description}>
          {effectiveDescription}
          {hasDescription && safeHref ? ' ' : null}
          {safeHref ? (
            <Link className={styles.link} href={safeHref} target="_blank" rel="noopener noreferrer">
              {strings.learnMore}
              <OpenRegular className={styles.linkIcon} aria-label={strings.opensInNewTab} />
            </Link>
          ) : null}
        </div>
      ) : null}
      {hasFooter ? (
        <div className={styles.footer} data-node-info-footer="">
          {footer}
        </div>
      ) : null}
    </Card>
  );
});
