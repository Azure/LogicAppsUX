import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const fnIconSize = '17px';
export const colors = {
  nodeActive: '#D5E4FF',
  edgeActive: '#62AAD8',
  handleActive: '#62AAD8',
  handleConnected: '#DCE6ED',
  edgeConnected: '#DCE6ED',
};

export const useStyles = makeStyles({
  wrapper: {
    marginTop: '10px',
    fontSize: '18px',
  },
  fullNode: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
  },
  leftWrapper: {
    marginLeft: '23px',
  },
  rightWrapper: {
    marginRight: '23px',
  },
  rootNode: {
    fontWeight: '600',
  },
  circleNonHoveredAndNonConnected: {
    color: '#fff',
    stroke: '#ddd',
  },
  rightTreeItemLayout: {
    ...shorthands.borderLeft('23px', 'solid', 'transparent'),
  },
  rightHandle: {
    left: '-15px',
  },
  handleWrapper: {
    backgroundColor: '#fff',
    width: '14px',
    height: '14px',
    ...shorthands.border('1px', 'solid', '#ddd'),
  },
  nodeWrapper: {
    width: '14px',
    height: '14px',
    backgroundColor: 'transparent',
  },
  functionButton: {
    ...shorthands.borderRadius('16px'),
    height: '26px',
    minWidth: '80px',
    display: 'inline-flex',
    justifyContent: 'left',
    paddingRight: '20px',
    ':hover': {
      ...shorthands.borderColor(colors.handleActive),
    },
  },
  selectedHoverFunctionButton: {
    ...shorthands.border('2px', 'solid', colors.handleActive),
  },
  loopSourceHandle: {
    height: '22px',
    width: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopIcon: {
    color: 'white',
  },
  functionName: {
    textWrap: 'nowrap',
    display: 'inline-table',
  },
  selectedHoverHandle: {
    ...shorthands.border('2px', 'solid', colors.handleActive),
  },
  connectedSelectedHoverHandle: {
    backgroundColor: colors.handleActive,
  },
  connectedHandle: {
    backgroundColor: colors.handleConnected,
  },
  iconContainer: {
    display: 'inline-flex',
    height: fnIconSize,
    flexShrink: '0 !important',
    flexBasis: fnIconSize,
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '3px',
  },
  temporaryCanvasNodeRoot: {
    width: '10px',
    height: '10px',
    backgroundColor: 'transparent',
  },
  temporaryCanvasNodeHandle: {
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
    left: '2px',
  },
});
