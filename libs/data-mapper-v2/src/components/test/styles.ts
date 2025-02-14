import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    width: '400px',
    backgroundColor: '#fff',
    overflow: 'visible',
    paddingLeft: '10px',
  },
  bodyWrapper: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    borderRadius: tokens.borderRadiusMedium,
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
    overflow: 'hidden',
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
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  messageBar: {
    marginBelow: '10px',
    width: '90%',
  },
  bodySpinner: {
    marginLeft: '5px',
  },
});
