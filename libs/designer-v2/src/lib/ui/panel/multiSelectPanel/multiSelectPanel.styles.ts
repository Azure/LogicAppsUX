import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

export const useMultiSelectPanelStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...shorthands.padding('16px'),
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    ...typographyStyles.subtitle1,
  },
  subtitle: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    marginBottom: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    overflowY: 'auto',
    flexGrow: 1,
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
  dialogList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    marginTop: '12px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  section: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  sectionTitle: {
    ...typographyStyles.subtitle2,
  },
  actionsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
  },
  footer: {
    marginTop: '16px',
    display: 'flex',
    ...shorthands.gap('8px'),
  },
  wrapSection: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  wrapHeading: {
    ...typographyStyles.subtitle2,
  },
  wrapButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
  },
});
