import { makeStyles, shorthands } from '@fluentui/react-components';
import { designTokens } from '../../../tokens/designTokens';

export const useEditorCollapseToggleStyles = makeStyles({
  toggleButton: {
    verticalAlign: 'top',
    display: 'inline-block',
    ...shorthands.padding('0'),

    '& img': {
      width: designTokens.sizes.commandIconWidth,
      height: designTokens.sizes.commandIconWidth,
      verticalAlign: 'middle',
    },

    '&[disabled]': {
      cursor: 'default',
      '& img': {
        opacity: '0.6',
      },
    },

    '@media (forced-colors: active)': {
      filter: 'invert(1)',
    },

    '&:hover': {
      '@media (forced-colors: active)': {
        forcedColorAdjust: 'none',
      },
    },
  },
});
