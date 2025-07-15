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

  connectorsList: {
    flex: 1,
    padding: '24px',
  },

  operationsList: {
    flex: 1,
    padding: '24px',
  },

  emptyOperationsIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: tokens.colorNeutralForeground3,
    '& svg': {
      fontSize: '48px',
    },
  },
  footer: {
    padding: `${tokens.spacingVerticalM} 0px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

// Connectors / Operations section styles
export const useConnectorSectionStyles = makeStyles({
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

  tableStyle: {
    width: '100%',
    margin: '0 auto',
  },

  connectorIcon: {
    width: '24px',
    height: '24px',
    objectFit: 'contain',
  },

  iconTextCell: {
    alignItems: 'center',
    display: 'flex',
  },

  iconsCell: {
    textAlign: 'right',
    width: '1%',
  },
});
