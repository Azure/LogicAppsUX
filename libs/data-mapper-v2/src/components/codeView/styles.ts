import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

export const useStyles = makeStyles({
  containerStyle: {
    height: '100%',
    width: '100%',
    ...shorthands.overflow('hidden'),
    ...shorthands.padding('12px'),
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  titleTextStyle: {
    ...typographyStyles.body1Strong,
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
  },
});
