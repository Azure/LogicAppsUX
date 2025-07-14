import { makeStyles, tokens } from '@fluentui/react-components';

export const useExportStyles = makeStyles({
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
});
