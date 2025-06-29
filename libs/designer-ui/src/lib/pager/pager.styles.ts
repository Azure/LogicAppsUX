import { makeStyles, shorthands } from '@fluentui/react-components';

export const usePagerStyles = makeStyles({
  pageNumbers: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  pagerV2: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.margin('5px'),
    position: 'relative',
    zIndex: '5', // Force pager to render over lines

    '& > *': {
      alignSelf: 'flex-start',
    },

    '& > *:not(:last-child)': {
      marginRight: '4px',
    },
  },

  pagerV2Alternate: {
    justifyContent: 'space-around',
  },

  pagerV2Inner: {
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',

    '& > *': {
      alignSelf: 'center',
    },
  },

  pageNum: {
    cursor: 'default',
  },

  pageNumSelectable: {
    color: 'rgb(0, 120, 212)',
    cursor: 'pointer',

    '&:hover': {
      textDecoration: 'underline',
    },
  },

  failedContainer: {
    position: 'relative',
  },

  failedIcon: {
    cursor: 'pointer',
    pointerEvents: 'none',
    position: 'absolute',
    color: '#a80000',
    backgroundColor: 'transparent',
    top: '25%',
    height: '24px',
  },

  failedIconDark: {
    color: '#f1707b',
  },

  // Styles for foreach and until cards
  foreachPager: {
    marginBottom: '30px',
  },
});
