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
});
