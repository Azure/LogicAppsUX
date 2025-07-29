import { makeStyles, tokens } from '@fluentui/react-components';

export const useComboboxStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
    '& .msla-combobox-label': {
      fontSize: '14px',
      paddingLeft: '5px',
    },
  },
  combobox: {
    width: '100%',
    minHeight: '30px',
    fontSize: '14px',
    '& input': {
      padding: '5px',
      outline: 'none',
      '&:hover': {
        cursor: 'pointer',
      },
    },
    '& button': {
      '&:hover': {
        cursor: 'pointer',
      },
    },
  },
  customOption: {
    color: 'rgb(0, 120, 212)', // Original custom option color from LESS
  },
  loadingOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  divider: {
    margin: '4px 0',
    border: 'none',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    padding: '8px 12px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
  },
  editorContainer: {
    borderRadius: '2px',
    resize: 'none',
    textOverflow: 'ellipsis',
    display: 'flex',
    position: 'relative',
  },
  editor: {
    position: 'relative',
    '& .editor-input': {
      border: `1px solid ${tokens.colorNeutralStroke1}`,
      resize: 'none',
      fontSize: '15px',
      tabSize: '1',
      minHeight: '30px',
      lineHeight: '30px',
      paddingInlineStart: '5px',
      outline: 'none',
      borderRadius: '4px',
      '&.readonly': {
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
      },
      '&:focus': {
        borderBottom: `1px solid ${tokens.colorBrandStroke1}`,
      },
      '&:focus::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '4px',
        borderLeft: `1px solid ${tokens.colorBrandStroke1}`,
        borderRight: `1px solid ${tokens.colorBrandStroke1}`,
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        pointerEvents: 'none',
      },
      '& p': {
        margin: 0,
        lineHeight: '22px',
        padding: '4px 30px 4px 0px',
        marginInlineStart: '2px',
      },
    },
    '& .editor-placeholder': {
      color: tokens.colorNeutralForeground3,
      overflow: 'hidden',
      position: 'absolute',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      width: '95%',
      marginTop: '-25px',
      marginLeft: '10px',
      fontSize: '14px',
      fontWeight: '400',
      fontStyle: 'italic',
      userSelect: 'none',
      display: 'inline-block',
      pointerEvents: 'none',
    },
  },
  clearButton: {
    height: '26px',
    width: '26px',
    minWidth: '26px',
    margin: '2px',
    position: 'absolute',
    right: 0,
    color: tokens.colorBrandForeground1,
  },
});
