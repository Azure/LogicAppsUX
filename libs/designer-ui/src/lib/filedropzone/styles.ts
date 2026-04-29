import { makeStyles, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '16px',
    opacity: 1,
  },

  dragging: {
    border: `2px dashed ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },

  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },

  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground2,
    marginBottom: '12px',
    pointerEvents: 'none',
  },

  mainText: { marginBottom: '4px', pointerEvents: 'none' },
  subText: { color: tokens.colorNeutralForeground3, pointerEvents: 'none' },
  linkText: { color: tokens.colorBrandForeground1, textDecoration: 'underline' },
  acceptText: { color: tokens.colorNeutralForeground4, marginTop: '8px', pointerEvents: 'none' },
});
