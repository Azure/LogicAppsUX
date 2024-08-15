import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const fnIconSize = '17px';
export const colors = {
  active: '#62AAD8',
  connected: '#C6DEEE',
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
  handleWrapper: {
    backgroundColor: '#fff',
    width: '14px',
    height: '14px',
    ...shorthands.border('1px', 'solid', '#ddd'),
  },
  sourceSchemaHandleWrapper: {
    left: '-8px',
  },
  targetSchemaHandleWrapper: {
    left: '-7px',
  },
  handleConnected: {
    backgroundColor: colors.connected,
    ...shorthands.border('1px', 'solid', colors.connected),
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
  },
  activeFunctionButton: {
    ...shorthands.border('3px', 'solid', colors.active),
  },
  functionName: {
    textWrap: 'nowrap',
    display: 'inline-table',
  },
  activeHandle: {
    backgroundColor: colors.active,
    ...shorthands.border('1px', 'solid', colors.active),
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
});
