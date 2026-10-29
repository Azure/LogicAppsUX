import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, Link, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Regular, DismissRegular, OpenRegular } from '@fluentui/react-icons';
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
  actions: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS },
  dismiss: {
    alignSelf: 'flex-start',
    boxSizing: 'content-box',
    minWidth: `${nodeMetrics.hoverCard.dismiss}px`,
    width: `${nodeMetrics.hoverCard.dismiss}px`,
    height: `${nodeMetrics.hoverCard.dismiss}px`,
    padding: tokens.spacingHorizontalXXS,
    margin: `calc(-1 * ${tokens.spacingHorizontalXXS})`,
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
  link: { fontSize: 'inherit', lineHeight: 'inherit' },
  linkIcon: { verticalAlign: '-1px', marginLeft: tokens.spacingHorizontalXS, fontSize: tokens.fontSizeBase200 },
  tileIcon: { fontSize: `${nodeMetrics.tile.mediumIcon}px` },
});
export interface NodeInfoCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  category: NodeCategory;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  configured?: boolean;
  description?: ReactNode;
  learnMoreHref?: string;
  onDismiss?: () => void;
  actions?: ReactNode;
  strings?: NodeInfoCardStrings;
}
export const NodeInfoCard = forwardRef<HTMLDivElement, NodeInfoCardProps>(function NodeInfoCard(
  {
    category,
    icon,
    title,
    subtitle,
    configured,
    description,
    learnMoreHref,
    onDismiss,
    actions,
    strings = defaultNodeStrings.info,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const resolvedIcon = resolveNodeIcons({ icon }, categoryNodeIcons[category]).icon;
  const safeHref = toSafeExternalHref(learnMoreHref);
  const hasDescription = description != null && description !== false && description !== '';
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
          <NodeIconTile category={category} icon={<span className={styles.tileIcon}>{resolvedIcon}</span>} size="small" bordered={false} />
        }
        header={
          <h3 className={styles.title} title={title}>
            {title}
          </h3>
        }
        description={
          subtitle || configured ? (
            <div className={styles.subtext}>
              {subtitle ? (
                <span className={styles.subtitle} title={subtitle}>
                  {subtitle}
                </span>
              ) : null}
              {subtitle && configured ? <span aria-hidden="true">·</span> : null}
              {configured ? (
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
          {description}
          {hasDescription && safeHref ? ' ' : null}
          {safeHref ? (
            <Link className={styles.link} href={safeHref} target="_blank" rel="noopener noreferrer">
              {strings.learnMore}
              <OpenRegular className={styles.linkIcon} aria-label={strings.opensInNewTab} />
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
});
