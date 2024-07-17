import { makeStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  },
  choiceGroupRoot: {
    backgroundColor: 'transparent',
  },
  choiceGroupOptionRoot: {
    backgroundColor: 'transparent',
  },
  uploadInputRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    marginTop: '20px',
  },
  selectorDropdownRoot: {
    alignSelf: 'center',
    marginTop: '20px',
  },
});
