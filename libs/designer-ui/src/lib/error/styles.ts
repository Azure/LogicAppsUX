import { makeStyles, tokens } from '@fluentui/react-components';

export const useErrorStyles = makeStyles({
  root: {
    textAlign: 'initial',
    boxSizing: 'border-box',
  },
  text: {
    color: '#bd0303',
    fontFamily: tokens.fontFamilyBase,
    textAlign: 'initial',
    wordBreak: 'break-all',
  },
  connectionText: {
    color: '#bd0303',
    textAlign: 'initial',
    wordBreak: 'break-all',
  },
  icon: {
    width: '30px',
    height: '30px',
    paddingRight: '5px',
    paddingTop: '10px',
    float: 'right',
    display: 'inline-block',
    cursor: 'pointer',
  },
});
