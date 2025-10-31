import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useAddActionCardV2Styles = makeStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardContainer: {
    border: '2px solid transparent',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusLarge,
    width: '64px',
    height: '64px',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    '&:hover': {
      border: `2px solid ${tokens.colorBrandStroke1}`,
      background: tokens.colorNeutralBackground1Hover,
    },
    '&:active': {
      background: tokens.colorNeutralBackground1Pressed,
    },
  },
  cardContainerSelected: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  selectionBox: {
    display: 'none', // Hide selection box for the new design
  },
  addIcon: {
    fontSize: '32px',
    color: tokens.colorNeutralForeground2,
    transition: 'color 0.2s ease',
  },
  cardTitle: {
    fontSize: '12px',
    textAlign: 'center',
    margin: '8px 0px',
    lineHeight: '16px',
  },
  tooltipContent: {
    maxWidth: '300px',
    margin: '10px',
  },
  tooltipHeading: {
    ...shorthands.margin('0', '0', '8px', '0'),
    fontSize: '14px',
    fontWeight: tokens.fontWeightSemibold,
  },
  tooltipBody: {
    margin: '0',
    fontSize: '12px',
  },
});
