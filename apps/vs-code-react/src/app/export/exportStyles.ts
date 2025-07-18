import { makeStyles, tokens } from '@fluentui/react-components';

export const useExportStyles = makeStyles({
  exportWorkflowsPanel: {
    display: 'flex',
    maxHeight: '65%',
  },

  exportWorkflowsPanelFilters: {
    display: 'flex',
    marginTop: '15px',

    '> *': {
      width: '30%',
    },
  },

  exportWorkflowsPanelFiltersInput: {
    marginRight: tokens.spacingHorizontalMNudge,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    // Prevent the example from taking the full width of the page (optional)
    maxWidth: '400px',
  },

  exportWorkflowsPanelListWorkflows: {
    overflow: 'auto',
    margin: '15px 0',
    flex: 1,
  },
  exportWorkflowsPanelListWorkflowsLoading: {
    '.ms-DetailsHeader-cell': {
      pointerEvents: 'none',
    },
  },

  exportWorkflowsPanelFiltersDropdown: {
    width: '100%',
  },

  exportWorkflowsPanelList: {
    flex: '5 1 auto',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '75%',
  },

  exportWorkflowsPanelListEmpty: {
    display: 'inline-flex',
    justifyContent: 'center',
    width: '100%',
  },

  exportWorkflowsPanelDivider: {
    padding: `0 ${tokens.spacingHorizontalXL}`,
    ':after': {
      width: '3px',
    },
  },

  exportWorkflowsPanelLimitInfo: {
    marginTop: `${tokens.spacingVerticalMNudge}`,
    '.ms-MessageBar-text': {
      display: 'inline-flex',
      alignItems: 'center',
    },
  },

  exportWorkflowsPanelSelected: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '20%',
    flex: '2 1 auto',
  },

  exportWorkflowsPanelSelectedTitle: {
    padding: '0 0 16px 8px',
  },

  exportWorkflowsPanelSelectedList: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    flex: 1,
  },

  exportWorkflowsPanelSelectedListItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },

  exportWorkflowsPanelSelectedListItemText: {
    maxWidth: '45%',
  },

  exportWorkflowsPanelSelectedListItemSubtext: {
    display: 'flex',
    maxWidth: '45%',
    paddingLeft: '6px',
    margin: '5px',
  },

  exportWorkflowsPanelSelectedListItemShimmer: {
    margin: tokens.spacingVerticalMNudge,
  },

  exportContainer: {
    height: '100vh',
    padding: ` 0 ${tokens.spacingVerticalXL}`,
  },

  exportTitle: {
    padding: '15px 0',
  },

  navigationPanel: {
    position: 'absolute',
    bottom: tokens.spacingVerticalMNudge,
    right: tokens.spacingVerticalMNudge,
  },

  navigationPanelButton: {
    margin: tokens.spacingHorizontalXL,
  },

  statusItem: {
    display: 'inline-flex',
    alignItems: 'center',
    margin: `${tokens.spacingVerticalMNudge} 0`,
  },

  validationContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '75%',
  },

  validationList: {
    flex: 2,
    overflow: 'auto',
    marginTop: tokens.spacingVerticalMNudge,
  },

  instancePanelDropdown: {
    width: '400px',
    margin: `${tokens.spacingVerticalL} 0`,
  },

  exportWorkflowsAdvancedOptionsTitle: {
    margin: '15px 0',
  },
  exportWorkflowsAdvancedOptionsDropdown: {
    width: '450px',
    margin: `${tokens.spacingVerticalL} 0`,
  },

  exportSummaryContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '75%',
  },

  exportSummaryFileLocation: {
    marginTop: tokens.spacingVerticalMNudge,
    display: 'flex',
    alignItems: 'flex-end',
  },

  exportSummaryFileLocationText: {
    width: '40%',
  },

  exportSummaryFileLocationButton: {
    margin: `0 ${tokens.spacingHorizontalMNudge}`,
  },

  exportSummaryPackageWarning: {
    marginTop: tokens.spacingVerticalMNudge,
    '.ms-MessageBar-text': {
      display: 'inline-flex',
      alignItems: 'center',
    },
  },

  exportSummaryDetailsList: {
    overflow: 'auto',
    marginTop: tokens.spacingVerticalMNudge,
    flex: 2,

    '.ms-DetailsRow-fields ': {
      display: 'flex',
      alignItems: 'center',

      '.ms-DetailsRow-cell': {
        whiteSpace: 'normal',
      },
    },
  },
  exportSummaryDetailListEmpty: {
    display: 'inline-flex',
    justifyContent: 'center',
    width: '100%',
  },

  exportSummaryConnections: {
    margin: `${tokens.spacingVerticalXL} 0`,
  },
  exportSummaryConnectionsCheckbox: {
    margin: `${tokens.spacingVerticalMNudge} 0`,
  },

  exportSummaryConnectionsDropdown: {
    width: '30%',
  },
  exportSummaryConnectionsButton: {
    margin: `${tokens.spacingVerticalXL} ${tokens.spacingVerticalXL} ${tokens.spacingVerticalXL} 0`,
  },
  exportSummaryNewResourceGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxWidth: '400px',
  },
});
