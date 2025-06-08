import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

/**
 * Flyout styles migrated from flyout/flyout.less
 * Includes responsive icon sizes and themed link colors
 */
export const useFlyoutStyles = makeStyles({
  flyout: {
    display: 'inline-block',
  },
  flyoutIcon: {
    '&.sm': {
      width: '14px',
      height: '14px',
      display: 'inline-block',
    },
    '&.lg': {
      width: '28px',
      height: '28px',
      margin: '8px',
    },
  },
});

export const useFlyoutCalloutStyles = makeStyles({
  flyoutCallout: {
    "& div[role='dialog']": {
      padding: '8px',
    },

    '& a': {
      '&:active, &:link, &:hover, &:visited': {
        textDecoration: 'underline',
        color: designTokens.colors.brandColor,
      },
    },
  },
});

/**
 * Dark theme specific styles for flyout callout
 */
export const useFlyoutCalloutDarkStyles = makeStyles({
  flyoutCallout: {
    '& a': {
      '&:active, &:link, &:hover, &:visited': {
        color: tokens.colorBrandBackground, // Fluent UI's primary theme color
      },
    },
  },
});
