import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

export const useSessionListStyles = makeStyles({
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
  header: {
    height: '60px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  logo: {
    height: '32px',
    width: 'auto',
    objectFit: 'contain' as const,
    maxWidth: '120px',
  },
  logoSmall: {
    height: '24px',
    maxWidth: '100px',
  },
  logoLarge: {
    height: '40px',
    maxWidth: '150px',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    paddingTop: `calc(${tokens.spacingVerticalM} + 8px)`,
    paddingBottom: `calc(${tokens.spacingVerticalM} + 8px)`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  buttonWrapper: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  sessions: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  sessionItem: {
    marginBottom: tokens.spacingVerticalS,
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    transition: 'all 0.2s ease',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1Hover),
    },
  },
  sessionItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    },
  },
  sessionContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    flex: 1,
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    cursor: 'pointer',
    ':hover': {
      textDecoration: 'underline',
      textDecorationColor: tokens.colorNeutralForeground3,
      textUnderlineOffset: '2px',
    },
  },
  lastMessage: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionTime: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
  },
  sessionActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  sessionActionsHidden: {
    opacity: 0.4,
    transition: 'opacity 0.2s ease',
  },
  sessionItemWrapper: {
    ':hover .session-actions': {
      opacity: 1,
    },
  },
  editInput: {
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  emptyStateText: {
    color: tokens.colorNeutralForeground3,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    ...shorthands.borderRadius('50%'),
    flexShrink: 0,
  },
  statusBadgeFailed: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  statusBadgeOther: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  sessionItemDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    },
  },
  typingIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('3px'),
  },
  typingDot: {
    width: '4px',
    height: '4px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorBrandForeground1,
    animationName: {
      from: { opacity: 0.3, transform: 'scale(0.8)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
  unreadBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    ...shorthands.padding('2px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    backgroundColor: tokens.colorBrandBackground,
    color: '#fff',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    marginLeft: 'auto',
  },
});
