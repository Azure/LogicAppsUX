import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { customTokens } from '../../../core/ThemeConect';

const fnIconSize = '17px';

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
    color: tokens.colorNeutralForeground1,
    stroke: '#ddd',
  },
  rightTreeItemLayout: {
    ...shorthands.borderLeft('23px', 'solid', 'transparent'),
  },
  rightHandle: {
    left: '-15px',
  },
  handleWrapper: {
    backgroundColor: tokens.colorNeutralForeground1,
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
      ...shorthands.borderColor(customTokens['handleActive']),
    },
  },
  selectedHoverFunctionButton: {
    ...shorthands.border('2px', 'solid', customTokens['handleActive']),
  },
  functionName: {
    textWrap: 'nowrap',
    display: 'inline-table',
  },
  selectedHoverHandle: {
    ...shorthands.border('2px', 'solid', customTokens['handleActive']),
  },
  connectedSelectedHoverHandle: {
    backgroundColor: customTokens['handleActive'],
  },
  connectedHandle: {
    backgroundColor: customTokens['handleConnected'],
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
