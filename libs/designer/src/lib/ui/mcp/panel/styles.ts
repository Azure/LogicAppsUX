import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpPanelStyles = makeStyles({
  drawer: {
    zIndex: 1000,
    height: '100%',
  },
  header: {
    padding: '16px 20px',
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  headerSubtitle: {
    color: tokens.colorNeutralForeground3,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  body: {
    padding: '0 20px',
    overflow: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  footer: {
    padding: `${tokens.spacingVerticalM} 20px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export const useMcpServerPanelStyles = makeStyles({
  workflowSection: {
    paddingBottom: '25px',
  },

  generateKeysContainer: {
    zIndex: 1000,
    height: '100%',
    width: '650px',
  },

  messageBar: { padding: '15px 0 0px 0' },
});
