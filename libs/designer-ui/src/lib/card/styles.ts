import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens';

// Re-export design tokens for card components
const { colors, sizes, typography } = designTokens;

export const useCardStyles = makeStyles({
  // Base card styles
  mslaCardLoading: {
    fontFamily: typography.fontFamily,
    ...shorthands.margin('10px'),
    ...shorthands.padding('10px'),
  },

  mslaCard: {
    ...shorthands.margin('0', 'auto'),
    minWidth: sizes.cardMinWidth,
    ...shorthands.border('1px', 'solid', colors.defaultBorderColor),
    boxSizing: 'content-box',
    fontFamily: typography.fontFamily,
    fontSize: typography.cardBodyFontSize,
    backgroundColor: colors.cardBackground,
  },

  mslaCardBody: {
    textAlign: 'justify',
    ...shorthands.padding('5px', '5px', '10px', '5px'),
  },

  mslaCardInnerBody: {
    ...shorthands.padding('12px'),
  },

  mslaCardSectionTitle: {
    fontSize: '16px',
  },

  mslaIframeTermsOfService: {
    paddingTop: '10px',

    '& iframe': {
      ...shorthands.border('1px', 'solid', colors.defaultBorderColor),
      width: '100%',
      height: '200px',
      minWidth: 'calc(100% - 20px)',
      backgroundColor: 'white',
    },
  },

  // Badge styles
  mslaBadge: {
    ...shorthands.border('1px', 'solid', '#666'),
    color: '#666',
    display: 'inline-block',
    fontSize: '11px',
    height: '14px',
    lineHeight: '13px',
    textAlign: 'center',
    textTransform: 'uppercase',
    ...shorthands.padding('1px', '4px'),
    marginLeft: '6px',
  },

  mslaBadgeDark: {
    ...shorthands.borderColor(tokens.colorNeutralForeground3),
    color: tokens.colorNeutralForeground3,
  },

  // Selection box styles
  mslaSelectionBox: {
    pointerEvents: 'none',
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    zIndex: 1,
    boxSizing: 'border-box',
    ...shorthands.borderRadius('2px'),
  },

  mslaSelectionBoxSelected: {
    ...shorthands.border('2px', 'solid', '#0078d4'),
  },

  mslaSelectionBoxSelectedWhiteOutline: {
    ...shorthands.outline('1px', 'solid', 'white'),
    outlineOffset: '-3px',
  },

  mslaSelectionBoxPinned: {
    ...shorthands.border('2px', 'solid', colors.pinnedItem),
  },

  mslaSelectionBoxDark: {
    ...shorthands.border('2px', 'solid', '#ffffff'),
  },

  // Panel card container styles
  mslaPanelCardContainer: {
    ...shorthands.border('1px', 'solid', '#c8c6c4'),
    boxSizing: 'border-box',
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.1), 0 1.6px 3.6px rgba(0, 0, 0, 0.13)',
    fontSize: '12px',
    ...shorthands.borderRadius('2px'),
    width: sizes.panelModeCardWidth,
    WebkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: '#fff',
    cursor: 'default',

    ':focus': {
      ...shorthands.outline('none'),
    },

    ':hover': {
      boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13) !important',
    },
  },

  mslaPanelCardContainerFocused: {
    '& .msla-selection-box': {
      ...shorthands.border('2px', 'solid', '#000000'),
    },
  },

  mslaPanelCardContainerSelected: {
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.1), 0 1.6px 3.6px rgba(0, 0, 0, 0.13)',
  },

  mslaPanelCardContainerDragging: {
    cursor: 'grabbing',
    opacity: 0.6,
    ...shorthands.outline('none'),
    boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13)',
  },

  mslaCardGhostImage: {
    position: 'fixed',
    pointerEvents: 'none',
    opacity: 1,
    zIndex: 12,
    boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0px 12px 40px rgba(0, 0, 0, 0.24)',
  },

  // Dark theme panel card container
  mslaPanelCardContainerDark: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),

    ':focus': {
      outlineColor: tokens.colorBrandStroke1,
    },

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },

  // Panel card main styles
  panelCardMain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  panelCardHeader: {
    cursor: 'pointer',
  },

  panelCardContentContainer: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'row',
    minHeight: '32px',
    alignItems: 'flex-start',
  },

  panelCardRightControls: {
    display: 'flex',
    flexDirection: 'column',
  },

  mslaCardEditButton: {
    ...shorthands.overflow('hidden'),
    flex: '0 0 30px',
    marginTop: '9px',
  },

  panelCardContentIconSection: {
    display: 'flex',
    ...shorthands.margin('8px', '8px', '8px', '0px'),
  },

  panelCardIcon: {
    height: '24px',
    width: '24px',
    ...shorthands.borderRadius('2px'),
  },

  panelCardIconDefault: {
    backgroundColor: 'rgb(71, 71, 71)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  panelCardTopContent: {
    alignSelf: 'center',
    flex: '1 1 auto',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
  },

  panelCardTopContentNoAction: {
    justifyContent: 'space-around',
  },

  panelMslaTitle: {
    alignSelf: 'center',
    display: 'inline-block',
    font: `14px/20px normal ${typography.semiboldFontFamily}`,
    ...shorthands.margin('10px', '8px', '10px', '0'),
    textAlign: 'left',
    wordBreak: 'break-word',
  },

  mslaCardTitle: {
    cursor: 'pointer',
    color: colors.cardText,
    textAlign: 'left',
  },

  panelCardExpand: {
    flex: '0 0 8px',
    display: 'inline-block',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
  },

  panelCardExpandLoading: {
    paddingBottom: '10px',
  },

  // Error styles
  mslaPanelCardError: {
    ...shorthands.margin('-4px', '12px', '6px'),
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },

  mslaPanelCardErrorText: {
    ...shorthands.margin('0px'),
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
  },

  errorStateError: {
    color: '#a80000',
  },

  errorStateErrorDark: {
    color: '#f1707b',
  },

  errorStateSevereWarning: {
    color: '#d83b01',
  },

  errorStateSevereWarningDark: {
    color: '#fce100',
  },

  errorStateSuccess: {
    color: '#107c10',
  },

  errorStateSuccessDark: {
    color: '#92c353',
  },

  errorStateInfo: {
    color: '#605e5c',
  },

  errorStateInfoDark: {
    color: '#a19f9d',
  },

  // Gripper section styles
  panelCardContentGripperSection: {
    minWidth: '12px',
    textAlign: 'center',
    visibility: 'hidden',
    paddingTop: '11px',
  },

  panelCardContentGripperSectionVisible: {
    visibility: 'visible',
  },

  panelCardContentGripperSectionDraggable: {
    cursor: 'grab',
  },

  panelCardContentGripperSectionDark: {
    '& svg path': {
      fill: '#c8c6c4',
    },
  },

  // Bottom toolbar styles
  panelCardBottomToolbar: {
    flex: '0 0 30px',
    height: '35px',
    width: '100%',
  },

  // Badge styles
  panelCardBadge: {
    alignItems: 'center',
    display: 'flex',
    fontSize: '11px',
    ...shorthands.padding('0', '4px'),
    ...shorthands.margin('5px'),
    ...shorthands.border('1px', 'solid', 'rgb(100, 100, 100)'),
  },

  // No action card styles
  mslaPanelCardContainerNoAction: {
    ...shorthands.border('1px', 'dashed', '#c8c6c4'),
    boxSizing: 'border-box',
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.1), 0 1.6px 3.6px rgba(0, 0, 0, 0.13)',
    fontSize: '12px',
    ...shorthands.borderRadius('2px'),
    width: sizes.panelModeCardWidth,
    WebkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: '#fff',
    cursor: 'default',
  },

  mslaPanelCardContainerNoActionDark: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorNeutralStroke1),
  },

  panelCardNoAction: {
    display: 'flex',
    justifyContent: 'space-around',
  },

  // Badges section styles
  mslaBadges: {
    borderTop: '1px solid #e1dfdd',
    display: 'flex',
    justifyContent: 'flex-end',
    ...shorthands.padding('2px', '5px'),
    textAlign: 'left',

    ':empty': {
      display: 'none',
    },
  },

  mslaBadgesDark: {
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },

  panelCardV2Badge: {
    ...shorthands.padding('4px'),
    fontSize: '12px',
    lineHeight: '12px',
  },

  panelCardV2BadgeActive: {
    color: '#323130',

    ':focus': {
      ...shorthands.outline('1px', 'solid', '#605e5c'),
    },
    ':hover': {
      backgroundColor: '#f3f2f1',
    },
    ':active': {
      backgroundColor: '#edebe9',
    },
  },

  panelCardV2BadgeActiveDark: {
    color: tokens.colorNeutralForeground3,

    ':focus': {
      ...shorthands.outline('1px', 'solid', '#a19f9d'),
    },
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },

  panelCardV2BadgeActiveDarkBackground: {
    color: '#fff',

    ':focus': {
      ...shorthands.outline('1px', 'solid', '#fff'),
    },
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
  },

  panelCardV2BadgeInactive: {
    color: '#a19f9d',
  },

  // Inactive card style
  mslaCardInactive: {
    opacity: 0.3,
  },

  // Other styles
  reactFlowEdges: {
    zIndex: '100 !important',
  },

  mslaContentFit: {
    width: '100%',
    height: '100%',
  },

  mslaBadgeSpinner: {
    width: '20px',
    height: '20px',

    '& .fui-Spinner__spinner': {
      width: '12px',
      height: '12px',
    },
  },

  // Managed identity error message
  errorMessageManagedIdentity: {
    color: '#a80000',
  },

  errorMessageManagedIdentityDark: {
    color: '#f1707b',
  },

  managedIdentityLink: {
    color: '#0066ff',
  },

  managedIdentityLinkDark: {
    color: '#69afe5',
  },

  // Button styles
  mslaButtonLink: {
    color: tokens.colorBrandBackground,
  },

  mslaCardButtonPrimary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
  },

  mslaCardButtonPrimaryDark: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
  },

  // Card V2 styles
  mslaCardV2: {
    backgroundColor: '#fff',
    ...shorthands.border('1px', 'solid', '#c8c6c4'),
    ...shorthands.borderRadius('2px'),
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.1), 0 1.6px 3.6px rgba(0, 0, 0, 0.13)',
    color: '#323130',
    cursor: 'pointer',
    display: 'flex',
    ...shorthands.margin('0', 'auto'),
    minHeight: sizes.cardV2Height,
    ...shorthands.padding('0'),
    width: sizes.cardV2Width,

    ':focus': {
      ...shorthands.outline('0'),
    },

    ':hover': {
      boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13)',
    },

    '& > img': {
      alignSelf: 'flex-start',
      height: '24px',
      ...shorthands.padding('8px'),
      width: '24px',
    },

    '& > span': {
      alignSelf: 'center',
      flex: '1',
      font: `14px/20px ${typography.semiboldFontFamily}`,
      ...shorthands.padding('8px', '0'),
      textAlign: 'left',
    },
  },

  mslaCardV2Selected: {
    boxShadow: '0 0 3.6px #0078d4, 0 0 14.4px #0078d4',
  },

  mslaCardV2Dark: {
    backgroundColor: tokens.colorNeutralForegroundInverted,
    boxShadow: '0 0.3px 0.9px rgba(255, 255, 255, 0.1), 0 1.6px 3.6px rgba(255, 255, 255, 0.13)',
    color: tokens.colorNeutralForeground1,

    ':hover': {
      boxShadow: '0 1.2px 3.6px rgba(255, 255, 255, 0.1), 0 6.4px 14.4px rgba(255, 255, 255, 0.13)',
    },
  },

  mslaCardV2SelectedDark: {
    boxShadow: '0 0 3.6px #85caff, 0 0 14.4px #85caff',
  },

  mslaCardHeaderSpinner: {
    ...shorthands.padding('2px'),
  },

  // Collapsed Card Styles
  mslaCollapsedCard: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: colors.scopeBackground,
    boxSizing: 'border-box',
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('2px', 'solid', '#979593'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    ':focus': {
      ...shorthands.outline('none'),
      ...shorthands.border('2px', 'solid', '#000000'),
    },

    ':focus, :hover': {
      boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13) !important',

      '& .panel-card-content-gripper-section': {
        visibility: 'visible',

        '&.draggable': {
          cursor: 'grab',
        },
      },
    },
  },

  mslaCollapsedCardIcon: {
    width: '24px',
    height: '24px',
    ...shorthands.margin('3px'),
  },

  mslaCollapsedCardDark: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke1),

    ':focus': {
      outlineColor: tokens.colorBrandStroke1,
      ...shorthands.border('2px', 'solid', '#ffffff'),
    },

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  // Scope Card Styles
  mslaScopeCard: {
    width: '100%',
    height: '100%',
    cursor: 'pointer',
  },

  mslaScopeCardWrapper: {
    boxSizing: 'border-box',
    color: '#fff',
    cursor: 'pointer',
    ...shorthands.margin('0', 'auto'),
    position: 'relative',
    width: sizes.cardV2Width,
    zIndex: 1,
    ...shorthands.borderRadius('2px'),
    backgroundColor: 'var(--brand-color, black)',
    boxShadow: '0 0.3px 0.9px rgba(0, 0, 0, 0.1), 0 1.6px 3.6px rgba(0, 0, 0, 0.13)',

    ':hover': {
      boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13)',

      '& .gripper-section': {
        visibility: 'visible',

        '&.draggable': {
          cursor: 'grab',
        },
      },
    },
  },

  mslaScopeCardContent: {
    display: 'flex',
    flexWrap: 'nowrap',
    ...shorthands.borderRadius('2px'),
    ...shorthands.overflow('hidden'),
    width: '100%',
  },

  mslaScopeCardTitleButton: {
    ...shorthands.border('none'),
    ...shorthands.padding('0px'),
    color: 'white',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: 'var(--brand-color, black)',
    width: '80%',
  },

  mslaScopeCardTitleBox: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  mslaScopeCardIconSection: {
    display: 'flex',
    ...shorthands.margin('8px', '8px', '8px', '0px'),
  },

  mslaScopeCardIcon: {
    height: '24px',
    width: '24px',
    ...shorthands.borderRadius('2px'),
  },

  mslaScopeGripperSection: {
    ...shorthands.padding('12px', '6px', '10px'),
    textAlign: 'center',
    visibility: 'hidden',
    filter: 'brightness(0) invert(1)', // Sets it to white
  },

  mslaScopeIcon: {
    height: '24px',
    width: '24px',
    ...shorthands.margin('0px', '2px', '0px', '-6px'),
    zIndex: 0,
  },

  mslaScopeTitle: {
    flexGrow: 1,
    alignSelf: 'center',
    display: 'inline-block',
    font: `14px/20px normal ${typography.semiboldFontFamily}`,
    ...shorthands.margin('10px', '8px', '10px', '0'),
    textAlign: 'left',
    wordBreak: 'break-word',
  },

  mslaScopePanelCardErrorWrapper: {
    width: '100%',
  },

  mslaScopePanelCardError: {
    ...shorthands.margin('-2px', '16px', '10px'),
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },

  mslaScopePanelCardErrorText: {
    ...shorthands.margin('0px'),
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
  },

  mslaScopePanelCardErrorState: {
    color: '#ffffff',
  },
});

// Helper function to get card classes with theme support
export const getCardClasses = (styles: ReturnType<typeof useCardStyles>, isDark?: boolean) => {
  return {
    card: styles.mslaCard,
    cardLoading: styles.mslaCardLoading,
    cardBody: styles.mslaCardBody,
    cardInnerBody: styles.mslaCardInnerBody,
    cardSectionTitle: styles.mslaCardSectionTitle,
    cardInactive: styles.mslaCardInactive,
    badge: mergeClasses(styles.mslaBadge, isDark && styles.mslaBadgeDark),
    selectionBox: styles.mslaSelectionBox,
    selectionBoxSelected: mergeClasses(styles.mslaSelectionBoxSelected, isDark && styles.mslaSelectionBoxDark),
    selectionBoxPinned: styles.mslaSelectionBoxPinned,
    panelCardContainer: mergeClasses(styles.mslaPanelCardContainer, isDark && styles.mslaPanelCardContainerDark),
    panelCardMain: styles.panelCardMain,
    panelCardHeader: styles.panelCardHeader,
    panelCardContentContainer: styles.panelCardContentContainer,
    panelCardError: styles.mslaPanelCardError,
    panelCardErrorText: styles.mslaPanelCardErrorText,
    badges: mergeClasses(styles.mslaBadges, isDark && styles.mslaBadgesDark),
    badgeSpinner: styles.mslaBadgeSpinner,
    // Collapsed card styles
    collapsedCard: mergeClasses(styles.mslaCollapsedCard, isDark && styles.mslaCollapsedCardDark),
    collapsedCardIcon: styles.mslaCollapsedCardIcon,
    // Scope card styles
    scopeCard: styles.mslaScopeCard,
    scopeCardWrapper: styles.mslaScopeCardWrapper,
    scopeCardContent: styles.mslaScopeCardContent,
    scopeCardTitleButton: styles.mslaScopeCardTitleButton,
    scopeCardTitleBox: styles.mslaScopeCardTitleBox,
    scopeCardIconSection: styles.mslaScopeCardIconSection,
    scopeCardIcon: styles.mslaScopeCardIcon,
    scopeGripperSection: styles.mslaScopeGripperSection,
    scopeIcon: styles.mslaScopeIcon,
    scopeTitle: styles.mslaScopeTitle,
    scopePanelCardErrorWrapper: styles.mslaScopePanelCardErrorWrapper,
    scopePanelCardError: styles.mslaScopePanelCardError,
    scopePanelCardErrorText: styles.mslaScopePanelCardErrorText,
    scopePanelCardErrorState: styles.mslaScopePanelCardErrorState,
  };
};

// Export error state classes helper
export const getErrorStateClasses = (styles: ReturnType<typeof useCardStyles>, errorLevel: string | undefined, isDark?: boolean) => {
  switch (errorLevel) {
    case 'error':
    case 'blocked':
      return mergeClasses(styles.errorStateError, isDark && styles.errorStateErrorDark);
    case 'severeWarning':
      return mergeClasses(styles.errorStateSevereWarning, isDark && styles.errorStateSevereWarningDark);
    case 'success':
      return mergeClasses(styles.errorStateSuccess, isDark && styles.errorStateSuccessDark);
    case 'info':
    case 'warning':
      return mergeClasses(styles.errorStateInfo, isDark && styles.errorStateInfoDark);
    default:
      return '';
  }
};
