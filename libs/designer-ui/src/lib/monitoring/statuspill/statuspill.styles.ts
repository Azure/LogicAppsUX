import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStatusPillStyles = makeStyles({
  pill: {
    position: 'absolute',
    right: '4px',
    top: '-20px',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('14px'),
    boxShadow: '0 0.6px 1.8px rgba(0, 0, 0, 0.25)',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI Semibold', sans-serif",
    fontSize: '13px',
    lineHeight: '1',
    zIndex: '2',
  },

  pillInner: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '28px',
    ...shorthands.margin('0', '2px'),

    '& > span': {
      marginRight: '4px',
      marginLeft: '8px',
      textAlign: 'right',
    },

    '& > img': {
      height: '24px',
      marginRight: '2px',
      width: '24px',
    },
  },

  statusOnly: {
    // Applied to the pill itself when status only
  },

  statusOnlyImg: {
    '& > img': {
      marginLeft: '2px',
      position: 'relative',
      top: '1px',
    },
  },
});
