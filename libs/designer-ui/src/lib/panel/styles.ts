import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens';

// Re-export design tokens for panel components
const { colors, sizes, typography } = designTokens;

export const usePanelStyles = makeStyles({
  // Main panel container styles
  mslaPanelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },

  // Panel select card container when empty
  mslaPanelSelectCardContainerEmpty: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  mslaPanelEmptyText: {
    fontSize: '14px',
    marginTop: '24px',
  },

  // Panel header styles
  mslaPanelHeader: {
    borderTop: '3px solid transparent',
    paddingTop: '12px',
    paddingBottom: '12px',
    display: 'flex',
  },

  mslaPanelCardHeader: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },

  mslaPanelCardIcon: {
    height: '32px',
    width: '32px',
    ...shorthands.borderRadius('2px'),
    marginRight: '4px',
  },

  mslaPanelCardIconDefault: {
    backgroundColor: 'rgb(71, 71, 71)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mslaPanelCardTitleContainer: {
    flexGrow: 1,

    '& * input': {
      font: `14px/20px normal ${typography.semiboldFontFamily}`,
      lineHeight: '24px',
    },
  },

  mslaCardTitle: {
    ...shorthands.margin('0px'),
    ...shorthands.border('1px', 'solid', 'transparent'),
    ...shorthands.borderRadius('2px'),

    ':hover': {
      ...shorthands.border('1px', 'solid', colors.panelModePanelBorderColor),
    },

    ':focus': {
      ...shorthands.margin('0px'),
      ...shorthands.borderRadius('2px'),
      ...shorthands.border('1px', 'solid', colors.panelModePanelBorderColor),
    },
  },

  mslaPanelHeaderControls: {
    height: '32px',
    width: '32px',
  },

  // Panel header buttons
  mslaPanelHeaderButtons: {
    ...shorthands.margin('0', '2rem', '0.5rem'),
  },

  mslaPanelHeaderButtonsButton: {
    alignSelf: 'flex-start',
    marginRight: '10px',
  },

  mslaPanelHeaderMessages: {
    ...shorthands.margin('0', '2rem', '0.5rem'),
  },

  // Panel comment container
  mslaPanelCommentContainer: {
    ...shorthands.margin('8px', '0px', '-8px'),
    ...shorthands.padding('12px', '32px'),
  },

  mslaPanelCommentContainerLight: {
    backgroundColor: colors.panelModeCommentFieldColorLight,
  },

  mslaPanelCommentContainerDark: {
    backgroundColor: colors.panelBackground,

    '& .ms-TextField-field': {
      backgroundColor: colors.panelBackground,
    },
  },

  mslaCardComment: {
    '& .ms-TextField-fieldGroup': {
      ...shorthands.outline('0.75px', 'solid', colors.panelModePanelBorderColor),

      ':hover, :focus': {
        ...shorthands.outline('1.25px', 'solid', colors.panelModePanelBorderColorDark),
      },
    },
  },

  mslaCardCommentFocused: {
    '& .ms-TextField-fieldGroup': {
      ...shorthands.outline('1.25px', 'solid', colors.panelModePanelBorderColorDark),
    },
  },

  mslaCommentIcon: {
    float: 'left',
    fontSize: sizes.cardHeaderIconSize,
    height: '20px',
    width: '20px',
    ...shorthands.padding('0px', '6px'),
    marginRight: '4px',
    textAlign: 'center',
  },

  // Panel trace container
  mslaPanelTraceContainer: {
    ...shorthands.padding('10px', '30px', '0', '30px'),
  },

  // Retry and request content
  mslaRetryContent: {
    fontFamily: typography.fontFamily,
    fontSize: '12px',
    ...shorthands.overflow('auto'),
    ...shorthands.padding('0', '1em'),
  },

  mslaRequestContent: {
    fontFamily: typography.fontFamily,
    fontSize: '12px',
    ...shorthands.overflow('auto'),
    ...shorthands.padding('0', '1em'),
  },

  mslaTraceInputsOutputs: {
    ...shorthands.margin('0', '0', '20px'),
  },

  // Nested panel container
  mslaPanelContainerNested: {
    boxSizing: 'border-box',
    display: 'flex',
    flex: '1',
    flexDirection: 'row',
    maxHeight: '100%',
    width: '100%',
  },

  mslaPanelContainerNestedLeft: {
    flexDirection: 'row-reverse',

    '& .msla-panel-header': {
      flexDirection: 'row-reverse',
    },

    '& .msla-panel-card-header': {
      marginLeft: '16px',
    },
  },

  mslaPanelContainerNestedRight: {
    '& .msla-panel-layout-pinned .msla-panel-card-header': {
      marginLeft: '16px',
    },
  },

  mslaPanelContainerNestedDual: {
    '& .msla-panel-layout': {
      flex: '0 0 50%',
      minWidth: '0',
    },

    '& > .msla-panel-contents': {
      flex: '0.5 0 0',
      minWidth: '0',
    },
  },

  // Panel layout
  mslaPanelLayout: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    width: '100%',
  },

  mslaPanelBorderPinned: {
    '& .msla-panel-header': {
      borderTopColor: colors.pinnedItem,
    },
  },

  mslaPanelContents: {
    display: 'flex',
    flex: '1 0 50%',
    flexDirection: 'column',
    maxWidth: '100%',
    overflowY: 'hidden',

    '& > div': {
      display: 'flex',
      flex: '1',
      flexDirection: 'column',
      maxHeight: '100%',
    },
  },

  mslaPanelContentContainer: {
    flex: '1',
    ...shorthands.padding('15px'),
    overflowY: 'auto',
  },

  mslaPanelContentsError: {
    ...shorthands.margin('10px'),
  },

  // Collapse toggle
  collapseToggle: {
    ...shorthands.margin('4px'),
  },

  collapseToggleLeft: {
    transform: 'rotate(180deg)',
  },

  collapseToggleLeftCollapsed: {
    transform: 'rotate(0deg)',
  },

  collapseToggleLeftEmpty: {
    alignSelf: 'flex-end',
  },

  collapseToggleRight: {
    transform: 'rotate(0deg)',
  },

  collapseToggleRightCollapsed: {
    transform: 'rotate(180deg)',
  },

  // Identity selector
  identitySelector: {
    display: 'flex',
    ...shorthands.margin('8px', '0px'),
    ...shorthands.gap('8px'),
    paddingLeft: '24px',
  },

  // Connection display
  connectionDisplay: {},

  connectionInfo: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  connectionInfoLabels: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.gap('8px'),
    maxWidth: '100%',

    '& > svg': {
      flex: '0 0 16px',
    },

    '& .label': {
      whiteSpace: 'nowrap',
    },
  },

  connectionInfoBadge: {
    display: 'flex',
  },

  changeConnectionButton: {
    marginLeft: '15px',
  },

  connectionInfoBadgeMargin: {
    marginLeft: '15px',
  },

  // Panel host container
  mslaPanelHostContainer: {
    zIndex: 'auto',
  },

  // Node details panel - basic container for panel content
  mslaNodeDetailsPanel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },

  // Panel mode - critical for panel styling
  mslaPanelMode: {
    position: 'relative',
  },

  // Recommendation panel styles
  mslaAppActionHeader: {
    ...shorthands.margin('0px', '-24px'),
    ...shorthands.padding('24px', '24px', '16px'),
    zIndex: 1,
    position: 'sticky',
    top: '0px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },

  mslaAppActionHeaderDark: {
    backgroundColor: tokens.colorNeutralBackground2,
  },

  // Filter container
  mslaFilterContainer: {
    marginTop: '7px',
    ...shorthands.padding('5px'),
  },

  mslaBlock: {
    display: 'block',
  },

  mslaFilterBtn: {
    display: 'inline-block',
    fontSize: '12px',
    lineHeight: '16px',
    color: 'black',
    ...shorthands.borderRadius('12px'),
    ...shorthands.padding('1px', '9px', '1px'),
    marginRight: '4px',
    marginTop: '2px',
  },

  mslaFilterSelected: {
    color: 'white',
    backgroundColor: 'black',
  },

  // Additional complex selectors from original .less that were missed

  // Panel container with direct child selector for collapse toggle
  mslaPanelContainerRoot: {
    '& > .collapse-toggle': {
      ...shorthands.margin('4px'),
    },
  },

  // Connection info with nested selectors
  connectionInfoLabelsNested: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.gap('8px'),
    maxWidth: '100%',

    '& > svg': {
      flex: '0 0 16px',
    },

    '& .label': {
      whiteSpace: 'nowrap',
    },
  },

  // Panel card icon with modifier class
  mslaPanelCardIconWithDefault: {
    height: '32px',
    width: '32px',
    ...shorthands.borderRadius('2px'),
    marginRight: '4px',

    '&.default': {
      backgroundColor: 'rgb(71, 71, 71)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },

  // Theme-specific dark mode comment container
  mslaPanelCommentContainerDarkTheme: {
    backgroundColor: colors.panelBackground,

    '& .ms-TextField-field': {
      backgroundColor: colors.panelBackground,
    },
  },

  // Additional recommendation panel selectors with proper nesting
  msBrowseResultsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    ...shorthands.gap('8px'),
  },

  mslaNoResultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('16px'),
    ...shorthands.gap('32px'),
  },

  // Panel commands selector
  msPanelCommands: {
    paddingTop: '0px',
  },

  // Result list and browse list
  mslaResultList: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },

  mslaBrowseList: {
    position: 'relative',
    ...shorthands.padding('4px', '0px'),
    display: 'flex',
    flexDirection: 'column',
  },

  // Filter container with nested selectors
  mslaFilterContainerNested: {
    marginTop: '7px',
    ...shorthands.padding('5px'),

    '& .msla-block': {
      display: 'block',
    },

    '& .msla-filter-btn': {
      display: 'inline-block',
      fontSize: '12px',
      lineHeight: '16px',
      color: 'black',
      ...shorthands.borderRadius('12px'),
      ...shorthands.padding('1px', '9px', '1px'),
      marginRight: '4px',
      marginTop: '2px',
    },

    '& .msla-filter-selected': {
      color: 'white',
      backgroundColor: 'black',
    },
  },
});

// Helper function to get panel classes with theme support
export const getPanelClasses = (styles: ReturnType<typeof usePanelStyles>, isDark?: boolean) => {
  return {
    panelContainer: styles.mslaPanelContainer,
    panelSelectCardContainerEmpty: styles.mslaPanelSelectCardContainerEmpty,
    panelEmptyText: styles.mslaPanelEmptyText,
    panelHeader: styles.mslaPanelHeader,
    panelCardHeader: styles.mslaPanelCardHeader,
    panelCardIcon: styles.mslaPanelCardIcon,
    panelCardIconDefault: mergeClasses(styles.mslaPanelCardIcon, styles.mslaPanelCardIconDefault),
    panelCardIconWithDefault: styles.mslaPanelCardIconWithDefault,
    panelCardTitleContainer: styles.mslaPanelCardTitleContainer,
    cardTitle: styles.mslaCardTitle,
    panelHeaderControls: styles.mslaPanelHeaderControls,
    panelHeaderButtons: styles.mslaPanelHeaderButtons,
    panelHeaderButtonsButton: styles.mslaPanelHeaderButtonsButton,
    panelHeaderMessages: styles.mslaPanelHeaderMessages,
    panelCommentContainer: mergeClasses(
      styles.mslaPanelCommentContainer,
      isDark ? styles.mslaPanelCommentContainerDark : styles.mslaPanelCommentContainerLight
    ),
    cardComment: styles.mslaCardComment,
    cardCommentFocused: styles.mslaCardCommentFocused,
    commentIcon: styles.mslaCommentIcon,
    panelTraceContainer: styles.mslaPanelTraceContainer,
    retryContent: styles.mslaRetryContent,
    requestContent: styles.mslaRequestContent,
    traceInputsOutputs: styles.mslaTraceInputsOutputs,
    panelContainerNested: styles.mslaPanelContainerNested,
    panelContainerNestedLeft: mergeClasses(styles.mslaPanelContainerNested, styles.mslaPanelContainerNestedLeft),
    panelContainerNestedRight: mergeClasses(styles.mslaPanelContainerNested, styles.mslaPanelContainerNestedRight),
    panelContainerNestedDual: mergeClasses(styles.mslaPanelContainerNested, styles.mslaPanelContainerNestedDual),
    panelLayout: styles.mslaPanelLayout,
    panelBorderPinned: mergeClasses(styles.mslaPanelLayout, styles.mslaPanelBorderPinned),
    panelContents: styles.mslaPanelContents,
    panelContentContainer: styles.mslaPanelContentContainer,
    panelContentsError: styles.mslaPanelContentsError,
    collapseToggle: styles.collapseToggle,
    collapseToggleLeft: mergeClasses(styles.collapseToggle, styles.collapseToggleLeft),
    collapseToggleLeftCollapsed: mergeClasses(styles.collapseToggle, styles.collapseToggleLeft, styles.collapseToggleLeftCollapsed),
    collapseToggleLeftEmpty: mergeClasses(styles.collapseToggle, styles.collapseToggleLeft, styles.collapseToggleLeftEmpty),
    collapseToggleRight: mergeClasses(styles.collapseToggle, styles.collapseToggleRight),
    collapseToggleRightCollapsed: mergeClasses(styles.collapseToggle, styles.collapseToggleRight, styles.collapseToggleRightCollapsed),
    identitySelector: styles.identitySelector,
    connectionDisplay: styles.connectionDisplay,
    connectionInfo: styles.connectionInfo,
    connectionInfoLabels: styles.connectionInfoLabels,
    connectionInfoBadge: styles.connectionInfoBadge,
    changeConnectionButton: styles.changeConnectionButton,
    connectionInfoBadgeMargin: styles.connectionInfoBadgeMargin,
    panelHostContainer: styles.mslaPanelHostContainer,
    nodeDetailsPanel: styles.mslaNodeDetailsPanel,
    panelMode: styles.mslaPanelMode,
    appActionHeader: mergeClasses(styles.mslaAppActionHeader, isDark && styles.mslaAppActionHeaderDark),
    filterContainer: styles.mslaFilterContainer,
    block: styles.mslaBlock,
    filterBtn: styles.mslaFilterBtn,
    filterSelected: mergeClasses(styles.mslaFilterBtn, styles.mslaFilterSelected),

    // Additional complex selectors
    panelContainerRoot: styles.mslaPanelContainerRoot,
    connectionInfoLabelsNested: styles.connectionInfoLabelsNested,
    panelCommentContainerDarkTheme: mergeClasses(styles.mslaPanelCommentContainer, isDark && styles.mslaPanelCommentContainerDarkTheme),

    // Additional recommendation panel styles
    browseResultsContainer: styles.msBrowseResultsContainer,
    noResultsContainer: styles.mslaNoResultsContainer,
    panelCommands: styles.msPanelCommands,
    resultList: styles.mslaResultList,
    browseList: styles.mslaBrowseList,
    filterContainerNested: styles.mslaFilterContainerNested,
  };
};
