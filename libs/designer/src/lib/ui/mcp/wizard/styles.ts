import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpWizardStyles = makeStyles({
  wizardContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: tokens.colorNeutralBackground1,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 24px 20px 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    background: tokens.colorNeutralBackground1,
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
});

// ConnectorItem styles
export const useConnectorItemStyles = makeStyles({
  connectorItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: '12px',
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },
  },

  connectorIcon: {
    fontSize: '24px',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
  },

  connectorInfo: {
    flex: 1,
  },

  connectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },

  connectorSubtext: {
    color: tokens.colorNeutralForeground2,
  },

  itemActions: {
    display: 'flex',
    gap: '8px',
  },
});

// OperationItem styles
export const useOperationItemStyles = makeStyles({
  operationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    marginBottom: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },
  },

  operationIcon: {
    fontSize: '20px',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
  },

  operationInfo: {
    flex: 1,
  },

  operationSubtext: {
    color: tokens.colorNeutralForeground2,
    display: 'block',
  },

  itemActions: {
    display: 'flex',
    gap: '8px',
  },
});
