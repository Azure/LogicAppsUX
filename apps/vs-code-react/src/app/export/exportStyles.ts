import { makeStyles, tokens } from '@fluentui/react-components';

export const useExportStyles = makeStyles({
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
});
