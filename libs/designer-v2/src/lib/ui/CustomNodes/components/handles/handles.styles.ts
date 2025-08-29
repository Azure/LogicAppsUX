import { makeStyles } from '@fluentui/react-components';

export const useHandleStyles = makeStyles({
  nodeHandle: {
    border: 'none',
  },

  top: {
    transform: 'translate(-50%, 0%)',
    top: '0px',
    width: '100%',
    height: '100%',
    borderRadius: '2px',
    background: 'transparent',
    boxSizing: 'border-box',
    zIndex: '2',
  },

  bottom: {
    visibility: 'hidden',
    transform: 'translate(-50%, 0%)',
  },

  edgeDrawStart: {
    visibility: 'visible',
    background: 'var(--colorEdge)',
    width: '10px',
    height: '10px',
    borderRadius: '32px',
    transform: 'translate(-50%, 50)',
    bottom: '0px',
    zIndex: '3',

    '&:active, &:hover': {
      background: 'var(--colorSelection)',
    },
  },
});
