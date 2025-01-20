import { makeStyles } from '@fluentui/react';
import { tokens, typographyStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  pathText: {
    paddingLeft: '3px',
    fontSize: '8px',
    overflow: 'hidden',
    direction: 'rtl',
    marginLeft: '2px',
    maxWidth: '100%',
    whiteSpace: 'nowrap',
  },
  'pathText:after': {
    position: 'absolute',
    left: '0',
    content: '...',
  },
  optionText: {
    fontSize: '10px',
    marginLeft: '4px',
  },
  optionStack: {
    width: '170px',
  },
  icon: {
    minWidth: '12px',
  },
  inputStyles: {
    width: '100%',
    minWidth: '200px !important',
    maxWidth: '300px',
    display: 'inline-block',
  },
  inputLabel: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
  validationText: {
    fontSize: '10px',
    color: tokens.colorPaletteYellowForeground2,
  },
  validationWarningmessage: {
    fontStyle: 'italic',
  },
});
