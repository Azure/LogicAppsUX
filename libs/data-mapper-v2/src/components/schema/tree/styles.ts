import { makeStyles, shorthands } from '@fluentui/react-components';
import { colors } from '../..//common/reactflow/styles';

export const useStyles = makeStyles({
  typeAnnotation: {
    display: 'inline-flex',
    marginLeft: 'auto',
    marginRight: '15px',
  },
  sourceSchemaRoot: {
    marginLeft: '14px',
  },
  targetScehmaRoot: {
    marginRight: '14px',
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
      content: '" *"',
    },
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    width: '-webkit-fill-available',
  },
  container: {
    width: '-webkit-fill-available',
    height: '100%',
    zIndex: 998,
    overflowWrap: 'anywhere',
    backgroundColor: 'inherit',
    ':hover': {
      backgroundColor: '#D5E4FF',
    },
  },
  targetSchemaContainer: {
    marginLeft: '30px',
  },
  sourceSchemaContainer: {
    marginRight: '16px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '16px',
    width: '16px',
  },
  repeatingIcon: {
    fontSize: '12px',
    pointerEvents: 'none',
    color: '#ddd',
    zIndex: 1000,
  },
  repeatingConnectionIcon: {
    color: 'white',
    fontSize: '12px',
  },
  repeatingAndActiveNodeIcon: {
    color: colors.handleActive,
    fontSize: '12px',
  },
  left: {
    right: '16px',
  },
  right: {
    left: '16px',
  },
});
