import { makeStyles, tokens } from '@fluentui/react-components';

export const useExportStyles = makeStyles({
  root: {
    height: '100vh',
    padding: `0 ${tokens.spacingHorizontalXL}`,
    position: 'relative',
  },

  title: {
    padding: `${tokens.spacingVerticalM} 0`,
  },

  instancePanel: {
    // Base styles for instance panel
  },

  instancePanelDropdown: {
    width: '400px',
    margin: `${tokens.spacingVerticalM} 0`,
  },

  navigationPanel: {
    position: 'absolute',
    bottom: tokens.spacingVerticalXS,
    right: tokens.spacingVerticalXS,
  },

  navigationPanelButton: {
    margin: tokens.spacingHorizontalXL,
  },

  workflows: {
    display: 'initial',
  },

  workflowsPanel: {
    display: 'flex',
    maxHeight: '65%',
  },

  workflowsPanelFilters: {
    display: 'flex',
    marginTop: tokens.spacingVerticalM,
  },

  workflowsPanelFiltersInput: {
    marginRight: tokens.spacingHorizontalXS,

    '& input::placeholder': {
      fontStyle: 'normal',
    },
  },

  workflowsPanelFiltersDropdown: {
    width: '100%',
  },

  workflowsPanelFiltersItems: {
    '& > *': {
      width: '30%',
    },
  },

  workflowsPanelLimitSelection: {
    marginTop: tokens.spacingVerticalXS,

    '& .ms-MessageBar-text': {
      display: 'inline-flex',
      alignItems: 'center',
    },
  },

  workflowsPanelList: {
    flex: '5 1 auto',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '75%',

    '&.loading .ms-DetailsHeader-cell': {
      pointerEvents: 'none',
    },
  },

  workflowsPanelListWorkflows: {
    overflow: 'auto',
    margin: `${tokens.spacingVerticalM} 0`,
    flex: 1,
  },

  workflowsPanelListWorkflowsEmpty: {
    display: 'inline-flex',
    justifyContent: 'center',
    width: '100%',
  },

  workflowsPanelDivider: {
    padding: `0 ${tokens.spacingHorizontalXL}`,

    '&::after': {
      width: '3px',
    },
  },

  workflowsPanelSelected: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '20%',
    flex: '2 1 auto',
  },

  workflowsPanelSelectedTitle: {
    padding: `0 0 ${tokens.spacingVerticalM} ${tokens.spacingHorizontalXS}`,
  },

  workflowsPanelSelectedList: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    flex: 1,
  },

  workflowsPanelSelectedListItem: {
    display: 'inline-flex',
    alignItems: 'center',
  },

  workflowsPanelSelectedListItemText: {
    maxWidth: '45%',
  },

  workflowsPanelSelectedListItemSubtext: {
    display: 'flex',
    maxWidth: '45%',
    paddingLeft: tokens.spacingHorizontalXXS,
    margin: tokens.spacingVerticalXXS,
  },

  workflowsPanelSelectedListShimmer: {
    margin: tokens.spacingVerticalXS,
  },

  workflowsAdvancedOptionsTitle: {
    margin: `${tokens.spacingVerticalM} 0`,
  },

  workflowsAdvancedOptionsDropdown: {
    width: '450px',
    margin: `${tokens.spacingVerticalM} 0`,
  },

  validation: {
    display: 'flex',
    flexDirection: 'column',
    height: '75%',
  },

  validationList: {
    flex: 2,
    overflow: 'auto',
    marginTop: tokens.spacingVerticalXS,
  },

  summary: {
    display: 'flex',
    flexDirection: 'column',
    height: '75%',
  },

  summaryFileLocation: {
    marginTop: tokens.spacingVerticalXS,
    display: 'flex',
    alignItems: 'flex-end',
  },

  summaryFileLocationText: {
    width: '40%',
  },

  summaryFileLocationButton: {
    margin: `0 ${tokens.spacingHorizontalXS}`,
  },

  summaryDetailList: {
    overflow: 'auto',
    marginTop: tokens.spacingVerticalXS,
    flex: 2,

    '& .ms-DetailsRow-fields': {
      display: 'flex',
      alignItems: 'center',

      '& .ms-DetailsRow-cell': {
        whiteSpace: 'normal',
      },
    },
  },

  summaryDetailListEmpty: {
    display: 'inline-flex',
    justifyContent: 'center',
    width: '100%',
  },

  summaryConnections: {
    margin: `${tokens.spacingHorizontalXL} 0`,
  },

  summaryConnectionsCheckbox: {
    margin: `${tokens.spacingVerticalXS} 0`,
  },

  summaryConnectionsDropdown: {
    width: '30%',
  },

  summaryConnectionsButton: {
    margin: `${tokens.spacingHorizontalXL} ${tokens.spacingHorizontalXL} ${tokens.spacingHorizontalXL} 0`,
  },

  summaryPackageWarning: {
    marginTop: tokens.spacingVerticalXS,

    '& .ms-MessageBar-text': {
      display: 'inline-flex',
      alignItems: 'center',
    },
  },

  statusItem: {
    display: 'inline-flex',
    alignItems: 'center',
    margin: `${tokens.spacingVerticalXS} 0`,
  },
});
