import { makeStyles } from '@fluentui/react';
import { tokens, typographyStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  pathText: {
    paddingLeft: '5px',
    fontSize: '8px',
  },
  optionText: {
    fontSize: '12px',
  },
  inputStyles: {
    width: '100%',
    minWidth: '200px',
  },
  inputLabel: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
  validationText: {
    fontSize: '10px',
    color: tokens.colorPaletteYellowForeground2,
  },
});
