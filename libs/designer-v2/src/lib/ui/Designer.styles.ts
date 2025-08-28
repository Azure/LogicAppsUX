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
});
