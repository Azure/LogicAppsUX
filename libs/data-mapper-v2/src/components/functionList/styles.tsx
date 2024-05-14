import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

const fnIconSize = '12px';

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
    width: '210px',
  },
  functionTree: {
    backgroundColor: '#E8F3FE',
    width: '210px',
  },
  functionTreeItem: {
    backgroundColor: '#E8F3FE',
    paddingLeft: '10px',
  },
  listButton: {
    height: '30px',
    width: '100%',
    display: 'flex',
    backgroundColor: '#E8F3FE',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
    ':hover': {
      backgroundColor: '#E8F3FE',
    },
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
    width: '210px',
    paddingLeft: '4px',
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
});
