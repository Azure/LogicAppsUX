import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

export const useMultiSelectDeleteModalStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    marginTop: '12px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('6px', '8px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  listItemIcon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
  listItemText: {
    ...typographyStyles.body1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexGrow: 1,
  },
});
