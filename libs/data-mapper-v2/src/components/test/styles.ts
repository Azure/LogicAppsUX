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
    backgroundColor: '#fff',
  },
  accordianHeader: {
    fontWeight: 'bolder',
  },
  accordianPanel: {
    width: '90%',
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
  monacoEditorPlaceHolder: {
    position: 'relative',
    width: '70%',
    ...shorthands.padding('10px'),
    top: '-210px',
    left: '14%',
    fontStyle: 'italic',
    fontSize: '13px',
    color: tokens.colorNeutralStroke1Pressed,
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'none',
    ...shorthands.overflow('hidden'),
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
});
