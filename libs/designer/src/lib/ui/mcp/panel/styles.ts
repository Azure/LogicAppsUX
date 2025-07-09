import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useMcpPanelStyles = makeStyles({
  //
  drawer: {
    zIndex: 1000,
    height: '100%',
  },
  header: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
  },
  body: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
    overflow: 'auto',
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
  closeButton: {
    minWidth: 'auto',
    flexShrink: 0,
  },
  //

  panelContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
    position: 'relative',
  },

  resizeHandle: {
    position: 'absolute',
    left: '0',
    top: '0',
    bottom: '0',
    width: '4px',
    cursor: 'col-resize',
    zIndex: 1000,
    backgroundColor: 'transparent',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: 'background-color 0.2s ease',

    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
      borderLeft: `1px solid ${tokens.colorBrandStroke1}`,
    },

    ':focus': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '1px',
    },

    ':active': {
      backgroundColor: tokens.colorBrandBackgroundPressed,
    },
  },
});

export const useConnectorSelectionStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.colorNeutralBackground1,
    marginLeft: '4px', // Account for resize handle
  },

  header: {
    padding: '16px 20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },

  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  searchSection: {
    padding: '16px 20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
    position: 'sticky',
    top: '65px',
    zIndex: 99,
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStroke2} transparent`,

    '::-webkit-scrollbar': {
      width: '8px',
    },

    '::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },

    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke2,
      borderRadius: '4px',

      ':hover': {
        backgroundColor: tokens.colorNeutralStroke1,
      },
    },
  },

  connectorGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',

    '@media (min-width: 500px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
  },

  connectorCard: {
    padding: '16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: tokens.colorNeutralBackground1,

    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow4,
    },

    ':focus': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },

    ':active': {
      transform: 'translateY(0)',
      boxShadow: tokens.shadow2,
    },
  },

  connectorIcon: {
    width: '32px',
    height: '32px',
    marginBottom: '8px',
    borderRadius: '4px',
    objectFit: 'cover',
  },

  connectorTitle: {
    marginBottom: '4px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },

  connectorDescription: {
    opacity: 0.7,
    fontSize: '12px',
    lineHeight: '16px',
    color: tokens.colorNeutralForeground2,
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
    backgroundColor: tokens.colorNeutralBackground1,

    ':hover': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
      transform: 'translateX(4px)',
    },

    ':focus': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },

  operationTitle: {
    marginBottom: '4px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },

  operationDescription: {
    opacity: 0.7,
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    flexDirection: 'column',
    gap: '12px',
  },

  loadingText: {
    color: tokens.colorNeutralForeground2,
    fontSize: '14px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    opacity: 0.7,
    color: tokens.colorNeutralForeground2,
  },

  containerSmall: {
    fontSize: '14px',
    '@media (max-width: 400px)': {
      fontSize: '14px',
    },
  },

  headerSmall: {
    '@media (max-width: 400px)': {
      padding: '12px 16px',
    },
  },

  searchSectionSmall: {
    '@media (max-width: 400px)': {
      padding: '12px 16px',
    },
  },

  contentSmall: {
    '@media (max-width: 400px)': {
      padding: '12px 16px',
    },
  },

  connectorCardSmall: {
    '@media (max-width: 400px)': {
      padding: '12px',
    },
  },

  operationCardSmall: {
    '@media (max-width: 400px)': {
      padding: '10px 12px',
    },
  },

  fadeIn: {
    animationName: {
      '0%': { opacity: 0, transform: 'translateY(10px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
  },

  slideIn: {
    animationName: {
      '0%': { opacity: 0, transform: 'translateX(-20px)' },
      '100%': { opacity: 1, transform: 'translateX(0)' },
    },
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
  },
});
