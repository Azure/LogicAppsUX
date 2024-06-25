import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

const fnIconSize = '17px';

export const useStyles = makeStyles({
  headerText: {
    ...typographyStyles.caption1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    paddingLeft: tokens.spacingHorizontalXS,
    fontSize: '13px',
    marginTop: '8px',
    marginBottom: '8px',
  },
  functionSearchBox: {
    width: '100%',
  },
  functionTree: {
    backgroundColor: '#E8F3FE',
    width: '100%',
  },
  functionTreeItem: {
    backgroundColor: '#E8F3FE',
    paddingLeft: '10px',
    ':hover': {
      backgroundColor: '#D5E4FF',
      ...shorthands.borderRadius(tokens.borderRadiusCircular),
    },
    ':active': {
      backgroundColor: '#D5E4FF',
      ...shorthands.borderRadius(tokens.borderRadiusCircular),
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
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
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
    color: '#242424',
    ...shorthands.overflow('hidden'),
  },
  treeItem: {
    ':hover': {
      backgroundColor: '#E8F3FE',
    },
  },
  addIconAside: {
    paddingLeft: '0px',
    paddingRight: '4px',
    color: tokens.colorPaletteBlueBorderActive,
    fontSize: '12px',
  },
});
