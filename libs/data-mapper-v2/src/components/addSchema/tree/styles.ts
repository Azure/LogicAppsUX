import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  wrapper: {
    marginTop: '10px',
    fontSize: '18px',
    height: '100%',
    ...shorthands.overflow('hidden', 'scroll'),
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
});
