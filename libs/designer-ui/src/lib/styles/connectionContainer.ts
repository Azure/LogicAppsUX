import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Connection container styles migrated from connectioncontainer.less
 *
 * Original variables:
 * - connection-selector-font-size-small: 10px
 * - selector-list-text-font-size: 12px
 * - connection-selector-font-size-medium: 14px
 * - connection-switch-link-font-size: 16px
 */
export const connectionContainerTokens = {
  fontSizeSmall: '10px',
  fontSizeMedium: '12px',
  fontSizeLarge: '14px',
  fontSizeXLarge: '16px',
} as const;

export const useConnectionContainerStyles = makeStyles({
  connectionStatusIcon: {
    fontSize: connectionContainerTokens.fontSizeXLarge,
    verticalAlign: 'middle',
  },

  iconSuccess: {
    color: tokens.colorStatusSuccessForeground1,
  },

  iconError: {
    color: tokens.colorStatusDangerForeground1,
  },
});
