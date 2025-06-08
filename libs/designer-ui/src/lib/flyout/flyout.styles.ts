import { makeStyles, shorthands } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useFlyoutStyles = makeStyles({
  flyout: {
    display: 'inline-block',
  },

  flyoutIcon: {
    display: 'inline-block',
  },

  flyoutIconSm: {
    width: '14px',
    height: '14px',
  },

  flyoutIconLg: {
    width: '28px',
    height: '28px',
    ...shorthands.margin('8px'),
  },

  flyoutCallout: {
    '& div[role="dialog"]': {
      ...shorthands.padding('8px'),
    },

    '& a': {
      textDecoration: 'underline',
      color: designTokens.colors.brandColor, // Automatically handles theme switching

      '&:active, &:link, &:hover, &:visited': {
        textDecoration: 'underline',
        color: designTokens.colors.brandColor,
      },
    },
  },
});
