import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { customTokens } from '../../core/ThemeConect';

const fnIconSize = '17px';

export const useStyles = makeStyles({
  headerRoot: {
    marginTop: '5px',
    marginBottom: '5px',
  },
  headerText: {
    ...typographyStyles.caption1,
    borderRadius: tokens.borderRadiusMedium,
    paddingLeft: tokens.spacingHorizontalXS,
    fontSize: '14px',
    fontWeight: 600,
  },
  functionSearchBox: {
    width: '100%',
  },
  functionTree: {
    backgroundColor: customTokens['functionPanelBackground'],
    height: '100%',
    marginLeft: '15px',
    marginRight: '10px',
    overflow: 'scroll scroll',
  },
  functionTreeItem: {
    backgroundColor: customTokens['functionPanelBackground'],
    paddingLeft: '10px',
    ':hover': {
      backgroundColor: customTokens['listElemHover'],
      borderRadius: `${tokens.borderRadiusCircular} ${tokens.borderRadiusCircular} ${tokens.borderRadiusCircular} ${tokens.borderRadiusCircular}`,
      width: '100%',
    },
    ':active': {
      backgroundColor: customTokens['listElemHover'],
      borderRadius: tokens.borderRadiusCircular,
    },
  },
  dragWrapper: {
    // allows for oval shape without background during drag
    opacity: 0.99,
  },
  listButton: {
    height: '30px',
    width: '100%',
    backgroundColor: 'inherit',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
    display: 'flex',
    alignItems: 'center',
  },
  iconContainer: {
    height: fnIconSize,
    flexShrink: '0 !important',
    flexBasis: fnIconSize,
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralBackground1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  functionNameText: {
    display: 'flex',
    alignItems: 'center',
    width: '130px',
    paddingLeft: '8px',
    paddingRight: '4px',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
  },
  loopInfoText: {
    fontSize: '12px',
    width: '220px',
  },
  treeItem: {
    ':hover': {
      backgroundColor: customTokens['functionPanelBackground'],
    },
  },
  addIconAside: {
    paddingLeft: '0px',
    paddingRight: '4px',
    color: tokens.colorPaletteBlueBorderActive,
    fontSize: '12px',
  },
});
