import { makeStyles, shorthands } from '@fluentui/react-components';
import { colors } from '../..//common/reactflow/styles';

export const useStyles = makeStyles({
  wrapper: {
    marginTop: '10px',
    fontSize: '18px',
    height: '100%',
    ...shorthands.overflow('scroll', 'scroll'),
  },
  leftWrapper: {
    marginLeft: '15px',
  },
  rightWrapper: {
    marginRight: '15px',
  },
  rootNode: {
    fontWeight: '600',
    ':hover': {
      backgroundColor: '#D5E4FF',
    },
  },
  circleNonHoveredAndNonConnected: {
    color: '#fff',
    stroke: '#ddd',
  },
  rightTreeItemLayout: {
    ...shorthands.borderLeft('23px', 'solid', 'transparent'),
  },
  leafNode: {
    display: 'inline-flex',
    ':hover': {
      backgroundColor: '#D5E4FF',
    },
  },
  nodeSelected: {
    backgroundColor: '#D5E4FF',
  },
  typeAnnotation: {
    display: 'inline-flex',
    marginLeft: 'auto',
  },
  required: {
    ':after': {
      content: '"*"',
    },
  },
});

export const useHandleStyles = makeStyles({
  wrapper: {
    zIndex: 999,
    backgroundColor: '#fff',
    width: '14px',
    height: '14px',
    ...shorthands.border('1px', 'solid', '#ddd'),
    top: '16px',
  },
  connected: {
    backgroundColor: colors.handleConnected,
  },
  hidden: {
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
  },
  selected: {
    ...shorthands.border('2px', 'solid', colors.handleActive),
  },
  connectedAndSelected: {
    backgroundColor: colors.handleActive,
  },
  repeating: {
    height: '16px',
    width: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatingIcon: {
    color: 'white',
  },
  left: {
    right: '8px',
  },
  right: {
    left: '8px',
  },
});
