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

  stackContainer: {
    alignItems: 'stretch',
  },

  themeCard: {
    background: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '8px',
    padding: '16px',
    minWidth: '200px',
    transitionProperty: 'all',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-in-out',

    '&:hover': {
      background: tokens.colorNeutralBackground2Hover,
      transform: 'translateY(-2px)',
      boxShadow: `0 4px 12px ${tokens.colorNeutralShadowAmbient}`,
    },
  },

  logicAppCard: {
    background: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '8px',
    padding: '16px',
    flex: '1',
    transitionProperty: 'all',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-in-out',

    '&:hover': {
      background: tokens.colorNeutralBackground2Hover,
      transform: 'translateY(-1px)',
      boxShadow: `0 2px 8px ${tokens.colorNeutralShadowAmbient}`,
    },
  },

  transparentCard: {
    background: 'transparent',
    border: 'none',
  },

  cardDivider: {
    margin: '12px 0',
  },

  sectionDescription: {
    color: tokens.colorNeutralForeground3,
  },

  logicAppContainer: {
    padding: '8px',
    background: tokens.colorNeutralBackground3,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  dropdownRoot: {
    width: '100%',
  },

  dropdownField: {
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,

    '&:hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
    },

    '&:focus-within': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      boxShadow: `0 0 0 2px ${tokens.colorBrandStroke1}`,
    },
  },
});
