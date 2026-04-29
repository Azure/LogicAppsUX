import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for Chatbot UI components
 * Converted from .less to makeStyles for Fluent UI v9 compatibility
 */
export const useChatbotStyles = makeStyles({
  // Main container
  container: {
    top: 0,
    left: 0,
    position: 'absolute',
    height: '100%',
    width: '100%',
    minWidth: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },

  // Header styles
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    zIndex: 1,
  },

  headerCollapsed: {
    zIndex: 1,
  },

  headerIcon: {
    color: '#2899f5', // Keep original brand blue
    transform: 'scale(1.5)',
    width: '32px',
    height: '32px',
    margin: 0,
  },

  headerTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    lineHeight: '24px',
    margin: 0,
  },

  headerSubtitle: {
    width: 'fit-content',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: '15px',
    color: tokens.colorNeutralForeground2,
    display: 'block',
  },

  shieldCheckmarkRegular: {
    paddingRight: '4px',
  },

  protectedBadgeLink: {
    textDecorationLine: 'none',
    marginLeft: '16px',
    lineHeight: '12px',
  },

  collapseButton: {
    color: 'unset',
    marginLeft: 'auto',
  },

  // Content area
  content: {
    flexGrow: 2,
    display: 'flex',
    flexDirection: 'column-reverse',
    rowGap: tokens.spacingVerticalM,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL),

    // Custom scrollbar styles
    selectors: {
      '::-webkit-scrollbar': {
        width: '6px',
        height: '10px',
        backgroundColor: 'rgb(50, 49, 48)',
        ...shorthands.borderRadius('3px'),
      },
      '::-webkit-scrollbar-thumb': {
        ...shorthands.borderRadius('5px'),
        backgroundColor: '#b1b1b1',
      },
      '::-webkit-scrollbar-track': {
        backgroundColor: '#f1f1f1',
      },
    },
  },

  // Footer styles
  footer: {
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },

  protectedFooter: {
    ...shorthands.padding(0, tokens.spacingHorizontalS, tokens.spacingVerticalM, tokens.spacingHorizontalS),
    fontSize: '10.5px',
    display: 'flex',
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorPaletteGreenBorderActive,
    lineHeight: '12px',
  },

  aiNotice: {
    fontSize: '10px',
    marginTop: tokens.spacingVerticalS,
    lineHeight: '14px',
  },
});

/**
 * Dark theme overrides for chatbot styles
 * Applied conditionally based on theme
 */
export const useChatbotDarkStyles = makeStyles({
  container: {
    backgroundColor: '#252423', // Keep original dark background
  },

  headerSubtitle: {
    color: tokens.colorNeutralForegroundInverted,
  },

  content: {
    '::-webkit-scrollbar-thumb': {
      backgroundColor: '#888',
    },

    '::-webkit-scrollbar-track': {
      backgroundColor: '#1e1e1e',
    },
  },

  headerSubtitleDark: {
    color: '#a9a9a9', // Keep original dark mode color
  },
});
