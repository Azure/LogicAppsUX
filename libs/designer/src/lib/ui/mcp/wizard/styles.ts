import { makeStyles, tokens } from '@fluentui/react-components';

const borderStyle = `1px solid ${tokens.colorNeutralStroke3}`;
const mainGap = '16px';

export const useMcpWizardStyles = makeStyles({
  wizardContainer: {
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
    height: '90vh',
  },

  scrollableContent: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: '32px',
    overflow: 'auto',
    padding: '16px',
  },

  mainSection: {
    borderRadius: '8px',
    border: borderStyle,
    padding: mainGap,
    backgroundColor: tokens.colorNeutralBackground2,
  },

  section: {
    borderRadius: '8px',
    border: borderStyle,
    padding: mainGap,
    backgroundColor: tokens.colorNeutralBackground1,
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

  footer: {
    padding: `${tokens.spacingVerticalM} 0px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
});

const connectorButtonGap = '8px';

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
    marginRight: connectorButtonGap,
  },

  icon: {
    marginRight: connectorButtonGap,
  },

  iconText: {
    verticalAlign: 'top',
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
