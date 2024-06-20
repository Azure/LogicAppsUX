import { makeStyles, shorthands } from '@fluentui/react-components';

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
    backgroundColor: 'white',
    width: '14px',
    height: '14px',
    ...shorthands.border('1px', 'solid', '#ddd'),
  },
  handleConnected: {
    backgroundColor: '#C6DEEE',
    ...shorthands.border('1px', 'solid', '#C6DEEE'),
  },
  nodeWrapper: {
    width: '10px',
    height: '10px',
    backgroundColor: 'transparent',
  },
});
