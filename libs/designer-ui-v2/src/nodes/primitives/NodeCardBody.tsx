import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { nodeCardVars } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { NodeTestDataIndicator } from './NodeTestDataIndicator';
const useStyles = makeStyles({
  root: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
  },
  small: { gap: tokens.spacingHorizontalMNudge, padding: tokens.spacingHorizontalS },
  testData: { [nodeCardVars.textEndReserve]: `${nodeMetrics.testData.textReserve}px` },
  indicator: { position: 'absolute', right: tokens.spacingHorizontalL, bottom: tokens.spacingVerticalL, display: 'inline-flex' },
  footer: {
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalMNudge,
    paddingBottom: tokens.spacingVerticalMNudge,
    borderTop: `${tokens.strokeWidthThick} solid ${tokens.colorNeutralStroke3}`,
    borderBottomLeftRadius: `calc(${tokens.borderRadius2XLarge} - ${tokens.strokeWidthThin})`,
    borderBottomRightRadius: `calc(${tokens.borderRadius2XLarge} - ${tokens.strokeWidthThin})`,
    backgroundColor: `var(${nodeCardVars.footerBackground})`,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    '@media (forced-colors: active)': { borderTopColor: 'CanvasText' },
  },
  footerIcon: { display: 'inline-flex', fontSize: tokens.fontSizeBase500 },
  footerAction: { display: 'inline-flex', alignItems: 'center', marginInlineStart: 'auto' },
});
export interface NodeCardBodyProps extends HTMLAttributes<HTMLDivElement> {
  density?: 'default' | 'small';
  testData?: boolean;
  testDataLabel?: string;
}
export const NodeCardBody = forwardRef<HTMLDivElement, NodeCardBodyProps>(function NodeCardBody(
  { density = 'default', testData, testDataLabel, className, children, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, density === 'small' && styles.small, testData && styles.testData, className)}
    >
      {children}
      {testData ? (
        <span className={styles.indicator}>
          <NodeTestDataIndicator label={testDataLabel} />
        </span>
      ) : null}
    </div>
  );
});
export interface NodeCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  action?: ReactNode;
}
export const NodeCardFooter = forwardRef<HTMLDivElement, NodeCardFooterProps>(function NodeCardFooter(
  { icon, action, children, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <div {...rest} ref={ref} className={mergeClasses(styles.root, styles.footer, className)}>
      {icon != null ? (
        <span className={styles.footerIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {action != null ? <span className={styles.footerAction}>{action}</span> : null}
    </div>
  );
});
