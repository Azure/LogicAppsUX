import { makeStyles, shorthands } from '@fluentui/react-components';
import { colors } from '../..//common/reactflow/styles';

export const useStyles = makeStyles({
  typeAnnotation: {
    display: 'inline-flex',
    marginLeft: 'auto',
    marginRight: '15px',
  },
  sourceSchemaRoot: {
    marginLeft: '16px',
  },
  targetScehmaRoot: {
    marginRight: '16px',
  },
  root: {
    height: '100%',
  },
});

export const useTreeStyles = makeStyles({
  root: {
    height: '100%',
    scrollBehavior: 'smooth',
    scrollbarWidth: 'none',
  },
});

export const useTreeNodeStyles = makeStyles({
  required: {
    ':after': {
      content: '"*"',
    },
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    width: '-webkit-fill-available',
  },
  targetSchemaRoot: {
    paddingLeft: '7px',
  },
  container: {
    width: '-webkit-fill-available',
    height: '100%',
    zIndex: 998,
    ':hover': {
      backgroundColor: '#D5E4FF',
    },
  },
  targetSchemaContainer: {
    paddingLeft: '16px',
  },
  sourceSchemaContainer: {
    marginRight: '7px',
  },
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '-webkit-fill-available',
    height: '100%',
    zIndex: 999,
  },
  leafNode: {
    paddingLeft: '8px',
  },
  chevronIcon: {
    cursor: 'pointer',
  },
  active: {
    backgroundColor: '#D5E4FF',
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
    right: '7.5px',
  },
  right: {
    left: '7.5px',
  },
});
