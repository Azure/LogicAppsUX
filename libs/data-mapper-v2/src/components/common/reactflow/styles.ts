import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const fnIconSize = '17px';

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
    left: '-7px',
    ...shorthands.border('1px', 'solid', '#ddd'),
  },
  handleConnected: {
    backgroundColor: '#C6DEEE',
    ...shorthands.border('1px', 'solid', '#C6DEEE'),
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
  functionName: {
    textWrap: 'nowrap',
    display: 'inline-table',
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
