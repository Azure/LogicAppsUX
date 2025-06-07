import { makeStyles, shorthands } from '@fluentui/react-components';

export const useTipStyles = makeStyles({
  root: {},
  inner: {
    boxSizing: 'border-box',
    width: '388px',
  },
  message: {
    ...shorthands.padding('1em'),
    '& a': {
      '&:active, &:link, &:hover, &:visited': {
        textDecoration: 'underline',
        color: '#0058ad',
      },
    },
  },
  actions: {
    ...shorthands.padding('0', '0.5em', '0.5em'),
  },
  commandButton: {
    border: '1px solid transparent',
  },
  azureFunctionTipMessageLinkDiv: {
    paddingTop: '1em',
  },
});
