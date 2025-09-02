import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useAddActionCardV2Styles = makeStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardContainer: {
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke2),
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusLarge,
    width: '80px',
    height: '80px',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',

    '&:focus': {
      ...shorthands.outline('2px', 'solid', tokens.colorBrandStroke1),
      outlineOffset: '2px',
    },

    '&:hover': {
      border: `2px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
      transform: 'scale(1.02)',
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
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
    marginTop: '8px',
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
