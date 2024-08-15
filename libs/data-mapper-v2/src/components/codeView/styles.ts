import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
    backgroundColor: '#fff',
  },
  root: {
    width: '400px',
    backgroundColor: '#fff',
  },
  closeButton: {
    paddingBottom: '0px',
    paddingTop: '0px',
  },
});
