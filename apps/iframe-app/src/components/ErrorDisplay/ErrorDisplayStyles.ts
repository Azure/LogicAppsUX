import { makeStyles, tokens } from '@fluentui/react-components';

export const useErrorDisplayStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: tokens.fontFamilyBase,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: '20px',
    maxWidth: '100%',
    overflowX: 'clip',
    overflowY: 'auto',
    overflowWrap: 'anywhere',
  },
  title: {
    color: tokens.colorNeutralForeground1,
    marginBottom: '10px',
  },
  message: {
    margin: 0,
  },
  details: {
    marginTop: '10px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
  },
  detailsSecondary: {
    marginTop: '5px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
  },
});
