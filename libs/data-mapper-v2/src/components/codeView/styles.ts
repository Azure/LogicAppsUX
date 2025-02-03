import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding('10px'),
    backgroundColor: '#fff',
    marginRight: '10px',
  },
  root: {
    width: '400px',
    backgroundColor: '#fff',
    paddingLeft: '15px',
    paddingRight: '5px',
  },
  closeButton: {
    paddingBottom: '0px',
    paddingTop: '0px',
  },
  body: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
  },
  bodyContainer: {
    height: '90%',
  },
});
