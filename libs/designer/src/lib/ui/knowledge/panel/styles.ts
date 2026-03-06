import { makeStyles, tokens } from '@fluentui/react-components';

export const usePanelStyles = makeStyles({
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

export const useCreatePanelStyles = makeStyles({
  container: {
    padding: '10px',
  },

  sectionItem: {
    flexDirection: 'column',
    gap: '8px',
  },
});
