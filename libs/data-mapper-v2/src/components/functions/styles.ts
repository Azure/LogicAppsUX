import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  dataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    maxWidth: '80px',
    minWidth: '50px',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    display: 'flex',
    cursor: 'pointer',
  },
  functionsIcon: {
    height: '20px',
    width: '20px',
  },
  functionsChevronIcon: {
    marginTop: '15px',
  },
});
