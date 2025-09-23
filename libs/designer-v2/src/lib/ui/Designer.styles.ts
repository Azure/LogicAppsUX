import { makeStyles } from '@fluentui/react-components';

export const useDesignerStyles = makeStyles({
  layerHost: {
    position: 'absolute',
    inset: '0px',
    visibility: 'hidden',
  },
  topLeftContainer: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '24px',
  },

  vars: {
    '--colorSelection': '#1f85ff',
    '--colorHandoff': '#3352b9',
  },
  lightVars: {
    '--colorEdge': '#b1b1b7',
  },
  darkVars: {
    '--colorEdge': '#adadad',
  },
});
