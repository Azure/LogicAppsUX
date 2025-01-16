import { makeStyles, tokens } from '@fluentui/react-components';

export const useMapCheckerItemStyles = makeStyles({
  buttonStyle: {
    padding: '12px',
    width: '210px',
    justifyContent: 'left',
    margin: '5px 0px',
    boxShadow: tokens.shadow4,
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    wordBreak: 'break-word',
  },
  message: {
    fontSize: '12px',
    wordBreak: 'break-word',
  },
  badge: {
    display: 'block',
    marginBottom: '5px',
  },
});

export const useStyles = makeStyles({
  root: {
    width: '300px',
    paddingLeft: '10px',
  },
  title: {
    fontSize: '16px',
  },
});
