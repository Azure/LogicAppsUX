import { makeStyles, tokens } from '@fluentui/react-components';
import { nodeMetrics } from '../metrics';

/** Shared icon-button geometry for compact node headers; host components own rendering and menus. */
export const useNodeHeaderButtonStyles = makeStyles({
  button: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
    width: `${nodeMetrics.toolsHeader}px`,
    height: `${nodeMetrics.toolsHeader}px`,
    minWidth: '0',
    padding: '0',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: `calc(-1 * ${tokens.spacingVerticalS} - ${tokens.strokeWidthThick}) calc(-1 * ${tokens.spacingHorizontalXS})`,
    },
  },
  icon: {
    fontSize: `${nodeMetrics.toolsActionIcon}px`,
    width: `${nodeMetrics.toolsActionIcon}px`,
    height: `${nodeMetrics.toolsActionIcon}px`,
  },
});
