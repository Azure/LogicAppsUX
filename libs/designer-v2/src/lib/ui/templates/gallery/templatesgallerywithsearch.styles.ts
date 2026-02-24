import { makeStyles } from '@fluentui/react-components';

export const useTemplatesGalleryWithSearchStyles = makeStyles({
  wrapper: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },

  sortContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(343px, 100%), 1fr))',
    gap: '24px',
    justifyContent: 'center',
    marginBottom: '16px',
    marginTop: '16px',
  },

  sortFieldWrapper: {
    gridColumn: '-1',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
