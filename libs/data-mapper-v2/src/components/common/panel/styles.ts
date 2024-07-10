import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    backgroundColor: '#E8F3FE',
    ...shorthands.borderLeft('1px', 'solid', '#ddd'),
    width: '350px',
  },
  header: {
    paddingTop: '15px',
  },
  titleIcon: {
    display: 'inline-block',
    verticalAlign: 'text-bottom',
    marginRight: '5px',
  },
  search: {
    width: '100%',
    alignSelf: 'center',
  },
  body: {
    backgroundColor: '#E8F3FE',
  },
});
