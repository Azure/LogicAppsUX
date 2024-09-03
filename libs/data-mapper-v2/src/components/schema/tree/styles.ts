import { makeStyles, shorthands } from '@fluentui/react-components';

export const useStyles = makeStyles({
  wrapper: {
    marginTop: '10px',
    fontSize: '18px',
    height: '100%',
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
  schemaHandle: {
    zIndex: 999,
    backgroundColor: '#fff',
    width: '14px',
    height: '14px',
    ...shorthands.border('1px', 'solid', '#ddd'),
    top: '16px',
  },
  leftSchemaHandle: {
    right: '8px',
  },
  rightSchemaHandle: {
    left: '8px',
  },
  temporaryHandle: {
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
  },
});
