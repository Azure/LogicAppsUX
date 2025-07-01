import { makeStyles, shorthands } from '@fluentui/react-components';

export const useTemplatesGalleryStyles = makeStyles({
  galleryWrapper: {
    width: '100%',
    maxWidth: 'calc(343px * 4 + 24px * 3)', // 4 cards + 3 gaps
    ...shorthands.margin('0', 'auto'),
  },

  galleryList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 343px)',
    gap: '24px',
    justifyContent: 'start',
    marginBottom: '40px',
  },

  emptyList: {
    width: '100%',
    height: '80%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyListTitle: {
    paddingTop: '24px',
    paddingBottom: '8px',
  },
});
