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
    ...shorthands.padding(tokens.spacingVerticalM),
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
    ...shorthands.margin(0, 0, '5px', '5px'),
  },

  headerTitleContainer: {
    // Nested styles handled in separate classes
  },

  headerTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    lineHeight: '28px',
    ...shorthands.margin(0, tokens.spacingHorizontalM),
  },

  headerSubtitle: {
    marginLeft: tokens.spacingHorizontalM,
    width: 'fit-content',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    lineHeight: '15px',
    color: tokens.colorNeutralForeground2,
  },

  // Mode pill styles
  headerModePill: {
    ...shorthands.margin('0', tokens.spacingHorizontalXS),
    width: 'fit-content',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    ...shorthands.padding('3.5px', tokens.spacingHorizontalS),
    lineHeight: '15px',
  },

  shieldCheckmarkRegular: {
    paddingRight: '2px',
  },

  headerModeProtectedPill: {
    ...shorthands.margin('0', tokens.spacingHorizontalXS),
    width: 'fit-content',
    fontSize: tokens.fontSizeBase200,
    display: 'flex',
    alignItems: 'center',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundInverted,
    backgroundColor: '#387a25', // Keep original green for protected mode
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    ...shorthands.padding('3px', tokens.spacingHorizontalS),
    lineHeight: '10px',
  },

  protectedMessageLink: {
    color: tokens.colorNeutralForegroundInverted,
    selectors: {
      ':hover': {
        color: tokens.colorNeutralForegroundInverted,
      },
      ':focus': {
        color: `${tokens.colorNeutralForegroundInverted} !important`,
      },
    },
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
    color: '#489d42', // Keep original green
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
