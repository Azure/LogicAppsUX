import { makeStyles, tokens } from '@fluentui/react-components';

export const useDevToolboxStyles = makeStyles({
  container: {
    background: `linear-gradient(135deg, ${tokens.colorNeutralBackground1} 0%, ${tokens.colorNeutralBackground2} 100%)`,
    borderBottom: `2px solid ${tokens.colorBrandBackground}`,
    boxShadow: `0 2px 8px ${tokens.colorNeutralShadowAmbient}`,
    position: 'relative',
    overflow: 'hidden',
  },

  accordion: {
    position: 'relative',
  },

  accordionHeader: {
    padding: '16px 20px',
    background: tokens.colorNeutralBackground1,
    borderRadius: '8px 8px 0 0',
    position: 'relative',
  },

  accordionPanel: {
    padding: '20px',
    background: tokens.colorNeutralBackground1,
    borderRadius: '0 0 8px 8px',
    margin: '0 8px 8px 8px',
  },

  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  messageBar: {
    margin: '12px 20px',
    borderRadius: '8px',
    boxShadow: `0 2px 4px ${tokens.colorNeutralShadowAmbient}`,
    border: `1px solid ${tokens.colorStatusDangerBorder1}`,
  },

  themeToggleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
});
