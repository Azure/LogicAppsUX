import { makeStyles, tokens } from '@fluentui/react-components';

export const useLoadingDisplayStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: tokens.fontFamilyBase,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: '20px',
  },
  title: {
    color: tokens.colorNeutralForeground1,
    marginBottom: '10px',
  },
  message: {
    margin: 0,
  },
});
