import { makeStyles } from '@fluentui/react-components';

export const useTemplatesGalleryWithSearchStyles = makeStyles({
  sortContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 343px)',
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
