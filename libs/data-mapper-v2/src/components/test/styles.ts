import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    width: '400px',
    backgroundColor: '#fff',
    ...shorthands.overflow('visible'),
  },
  closeHeaderButton: {
    paddingBottom: '0px',
    paddingTop: '0px',
  },
  bodyWrapper: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
    backgroundColor: '#fff',
  },
  accordianHeader: {
    fontWeight: 'bolder',
  },
  footer: {
    backgroundColor: 'red',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    paddingLeft: '5px',
    bottom: '0px',
    right: '0px',
    left: '0px',
    zIndex: 1,
    position: 'fixed',
    ...shorthands.overflow('hidden'),
  },
  closeButton: {
    marginLeft: '10px',
  },
});
