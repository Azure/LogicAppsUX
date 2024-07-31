import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const fnIconSize = '17px';

const activeColor = '#62AAD8';
const connectedColor = '#C6DEEE';

export const useStyles = makeStyles({
  wrapper: {
    marginTop: '10px',
    fontSize: '18px',
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
    backgroundColor: connectedColor,
    ...shorthands.border('1px', 'solid', connectedColor),
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
    ...shorthands.border('3px', 'solid', activeColor),
  },
  functionName: {
    textWrap: 'nowrap',
    display: 'inline-table',
  },
  activeHandle: {
    backgroundColor: activeColor,
    ...shorthands.border('1px', 'solid', activeColor),
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
