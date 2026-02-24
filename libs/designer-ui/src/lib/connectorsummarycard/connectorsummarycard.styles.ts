import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useConnectorSummaryCardStyles = makeStyles({
  card: {
    position: 'relative',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '2px',
    ...shorthands.border('2px', 'solid', 'transparent'),
    outline: 'none',
    boxShadow: '0px 0.3px 4px 0px rgba(0, 0, 0, 0.1), 0px 1.6px 4px 0px rgba(0, 0, 0, 0.14)',
    cursor: 'pointer',
    alignItems: 'center',
    padding: '8px',
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    color: tokens.colorNeutralForeground1,

    '&:focus, &:hover': {
      boxShadow: '0 1.2px 3.6px rgba(0, 0, 0, 0.1), 0 6.4px 14.4px rgba(0, 0, 0, 0.13)',
    },

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },

    '&:focus': {
      outline: '0',
      ...shorthands.borderColor(tokens.colorNeutralStroke1),
    },

    '&:active': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
    },
  },

  title: {
    color: tokens.colorNeutralForeground1,
  },
});
