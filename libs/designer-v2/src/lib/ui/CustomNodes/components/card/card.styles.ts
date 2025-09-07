import { makeStyles, tokens } from '@fluentui/react-components';

export const colors = {
  success: tokens.colorStatusSuccessForeground1,
  danger: tokens.colorStatusDangerForeground1,
  neutral: '#808080',
  brand: tokens.colorBrandForeground1,
};

export const useCardStyles = makeStyles({
  root: {
    border: '2px solid transparent',
    boxSizing: 'border-box',
    fontSize: '12px',
    borderRadius: '4px',
    width: '200px',
    padding: '8px 10px',
    webkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',

    '&:hover': {
      background: tokens.colorNeutralBackground1Hover,
    },
    '&:active': {
      background: tokens.colorNeutralBackground1Pressed,
    },
  },
  scope: {
    background: 'var(--action-brand-color)',

    '&:hover': {
      background: 'color-mix(in hsl, var(--action-brand-color), black 10%)',
    },
    '&:active': {
      background: 'color-mix(in hsl, var(--action-brand-color), black 20%)',
    },
  },
  inactive: {
    opacity: 0.3,
  },
  selected: {
    border: `2px solid ${colors.brand}`,
  },
  statusSuccess: {
    border: `2px solid ${colors.success}`,
  },
  statusError: {
    border: `2px solid ${colors.danger}`,
  },
  icon: {
    alignSelf: 'flex-start',
    height: '24px',
    width: '24px',
    borderRadius: '2px',
    overflow: 'hidden',
    flexShrink: 0,

    '& > img': {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground1,
    lineHeight: '20px',
    flexGrow: 1,
  },
  scopeTitle: {
    color: '#fff',
  },

  // Badge
  badge: {
    position: 'absolute',
    top: '1px',
    right: '1px',
    transform: 'translate(50%, -50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: colors.neutral,
    display: 'flex',

    '& > img': {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeFailure: {
    backgroundColor: colors.danger,
  },
  badgeNeutral: {
    backgroundColor: colors.neutral,
  },
  badgeBrand: {
    backgroundColor: colors.brand,
  },
  spinner: {
    '& > .fui-Spinner__spinner': {
      width: '12px',
      height: '12px',
      margin: '2px',
    },
  },
  badgeText: {
    color: tokens.colorNeutralForegroundInverted,
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    textAlign: 'center',
    lineHeight: '20px',
  },
  tooltipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px',
    maxWidth: '200px',
  },
});
