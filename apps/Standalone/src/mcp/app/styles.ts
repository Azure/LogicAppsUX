import { makeStyles, tokens } from '@fluentui/react-components';

export const useMcpStandardStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: `linear-gradient(135deg, ${tokens.colorNeutralBackground1} 0%, ${tokens.colorNeutralBackground2} 100%)`,
    overflow: 'hidden',
  },

  header: {
    padding: '20px 24px',
    background: tokens.colorNeutralBackground1,
    borderBottom: `2px solid ${tokens.colorBrandBackground}`,
    boxShadow: `0 2px 8px ${tokens.colorNeutralShadowAmbient}`,
    position: 'relative',
    zIndex: 10,
  },

  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
  },

  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: tokens.colorNeutralBackground3,
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },

  awaitingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '24px',
    padding: '40px',
  },

  wizardContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  wizardContent: {
    flex: 1,
    padding: '24px',
    background: tokens.colorNeutralBackground1,
    borderRadius: '12px 12px 0 0',
    margin: '0 16px',
    boxShadow: `inset 0 2px 8px ${tokens.colorNeutralShadowAmbient}`,
    position: 'relative',
  },

  wizardWrapper: {
    background: tokens.colorNeutralBackground2,
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    minHeight: '100%',
    position: 'relative',
    overflow: 'hidden',
  },

  fadeIn: {
    animationName: {
      '0%': { opacity: '0', transform: 'translateY(20px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  layerHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1000,
  },
});
