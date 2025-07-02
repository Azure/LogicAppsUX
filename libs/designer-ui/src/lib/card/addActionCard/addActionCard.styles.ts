import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useAddActionCardStyles = makeStyles({
  root: {
    position: 'relative',
  },
  cardContainer: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    boxSizing: 'border-box',
    boxShadow: `0 0.3px 0.9px ${tokens.colorNeutralShadowAmbient}, 0 1.6px 3.6px ${tokens.colorNeutralShadowKey}`,
    fontSize: '12px',
    borderRadius: tokens.borderRadiusSmall,
    width: '200px',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'default',

    '&:focus': {
      ...shorthands.outline('none'),
      '& .msla-selection-box': {
        ...shorthands.border('2px', 'solid', tokens.colorNeutralForeground1),
      },
    },

    '&:focus, &:hover': {
      boxShadow: `0 1.2px 3.6px ${tokens.colorNeutralShadowAmbient}, 0 6.4px 14.4px ${tokens.colorNeutralShadowKey} !important`,

      '& .panel-card-content-gripper-section': {
        visibility: 'visible',
        '&.draggable': {
          cursor: 'grab',
        },
      },
    },
  },
  cardContainerSelected: {
    boxShadow: `0 0.3px 0.9px ${tokens.colorNeutralShadowAmbient}, 0 1.6px 3.6px ${tokens.colorNeutralShadowKey}`,
  },
  selectionBox: {
    pointerEvents: 'none',
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    zIndex: 1,
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusSmall,
    borderLeft: '0',

    '&.selected': {
      ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
    },
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardHeader: {
    cursor: 'pointer',
  },
  cardContentContainer: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'row',
    minHeight: '32px',
    alignItems: 'flex-start',
  },
  cardContentGripperSection: {
    minWidth: '12px',
    textAlign: 'center',
    visibility: 'hidden',
    paddingTop: '11px',
  },
  cardContentIconSection: {
    display: 'flex',
    ...shorthands.margin('8px', '8px', '8px', '0px'),
  },
  cardIcon: {
    height: '24px',
    width: '24px',
    borderRadius: tokens.borderRadiusSmall,
  },
  cardTopContent: {
    alignSelf: 'center',
    flex: '1 1 auto',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  cardTitle: {
    alignSelf: 'center',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '20px',
    ...shorthands.margin('10px', '8px', '10px', '0'),
    textAlign: 'left',
    wordBreak: 'break-word',
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
