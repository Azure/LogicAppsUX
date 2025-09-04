import { makeStyles, tokens } from '@fluentui/react-components';

export const useCloneWizardStyles = makeStyles({
  wizardContainer: {
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
    height: '95vh',
    width: '70%',
  },

  scrollableContent: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: '32px',
    overflow: 'auto',
    padding: '16px',
  },

  footer: {
    padding: `${tokens.spacingVerticalM} 0px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
});
