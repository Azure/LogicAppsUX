import { makeStyles, shorthands } from '@fluentui/react-components';

export const useTextEditorStyles = makeStyles({
  root: {
    backgroundColor: '#fff',
    color: '#000000',
    fontSize: '12px',
    cursor: 'text',
    minHeight: '26px',
    ...shorthands.padding('0', '10px'),
    position: 'relative',
    lineHeight: '24px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  token: {
    display: 'inline-block',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '24px 24px',
    paddingLeft: '34px',
    ...shorthands.margin('0', '2px', '0', '0'),
  },
  draftStyleBlock: {
    // Override styles globally set by react-draft-wysiwyg
    ...shorthands.margin('0'),
  },
  editorInputToken: {
    display: 'inline-flex',
    paddingRight: '4px',
    position: 'relative',
  },
  editorInputSecureToken: {
    position: 'absolute',
    left: '17px',
    top: '6px',
  },
});

export const useTextEditorDarkThemeStyles = makeStyles({
  root: {
    backgroundColor: 'inherit',
    color: 'inherit',
  },
  editorInputToken: {
    ...shorthands.border('1px', 'solid', '#fff'),
  },
});
