import { makeStyles } from '@fluentui/react-components';

export const useOperationSearchGroupStyles = makeStyles({
  searchGroup: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  seeMoreButton: {
    position: 'absolute',
    right: '0',
    fontSize: '8px',
  },

  header: {
    display: 'flex',
    flexWrap: 'nowrap',
    flexGrow: '1',
  },

  headerDisplay: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '8px',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '20px',
    textAlign: 'left',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },

  headerIcons: {
    gap: '8px',
    display: 'flex',
    alignItems: 'center',
  },
});
