import { createContext, forwardRef, useContext } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { nodeCardVars } from '../../theme/tokens';

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
});
export interface NodeTextProps extends HTMLAttributes<HTMLSpanElement> {
  title: string;
  subtitle?: string;
  /** Maximum title lines; defaults to a single ellipsized line. */
  titleLines?: 1 | 2;
}
export const NodeHoverCardActiveContext = createContext(false);
export const NodeText = forwardRef<HTMLSpanElement, NodeTextProps>(function NodeText(
  { title, subtitle, titleLines = 1, className, ...rest },
  ref
) {
  const styles = useStyles();
  const hover = useContext(NodeHoverCardActiveContext);
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, className)}>
      <span className={mergeClasses(styles.title, titleLines === 2 && styles.titleTwoLines)} title={hover ? undefined : title}>
        {title}
      </span>
      {subtitle ? (
        <span className={styles.subtitle} title={hover ? undefined : subtitle}>
          {subtitle}
        </span>
      ) : null}
    </span>
  );
});
export const joinNodeSubtitle = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ');
