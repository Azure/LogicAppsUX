import { makeStyles, tokens } from '@fluentui/react-components';

const borderStyle = `1px solid ${tokens.colorNeutralStroke1}`;
const mainGap = '16px';

export const useMcpWizardStyles = makeStyles({
  wizardContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    height: '100%',
    background: tokens.colorNeutralBackground1,
    gap: '32px',
  },

  section: {
    borderRadius: '8px',
    border: borderStyle,
    padding: mainGap,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    position: 'relative',
    borderBottom: borderStyle,
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: mainGap,
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px',
    textAlign: 'center',
  },

  emptyStateIcon: {
    fontSize: '64px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '16px',
    '& svg': {
      width: '64px',
      height: '64px',
    },
  },

  connectorsList: {
    flex: 1,
    padding: '24px',
  },

  footer: {
    padding: `${tokens.spacingVerticalM} 0px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});
