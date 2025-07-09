import { makeStyles, tokens } from '@fluentui/react-components';

export const useConnectorSelectionStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
  },

  searchSection: {
    padding: '16px 20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  },

  connectorGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },

  connectorCard: {
    padding: '16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },

  connectorIcon: {
    width: '32px',
    height: '32px',
    marginBottom: '8px',
    borderRadius: '4px',
  },

  connectorTitle: {
    marginBottom: '4px',
  },

  connectorDescription: {
    opacity: 0.7,
    fontSize: '12px',
    lineHeight: '16px',
  },

  operationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  operationCard: {
    padding: '12px 16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },

  operationTitle: {
    marginBottom: '4px',
  },

  operationDescription: {
    opacity: 0.7,
    fontSize: '12px',
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    opacity: 0.7,
  },
});
