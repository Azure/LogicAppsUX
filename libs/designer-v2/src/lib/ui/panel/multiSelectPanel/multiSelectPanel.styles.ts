import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

export const useMultiSelectPanelStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    ...shorthands.padding('14px'),
    ...shorthands.gap('24px'),
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
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
    overflowY: 'auto',
  },
  tagIcon: {
    width: '20px',
    height: '20px',
    ...shorthands.margin('4px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
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
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
  },
  wrapButtonIcon: {
    width: '20px',
    height: '20px',
  },
  menuItemIcon: {
    width: '20px',
    height: '20px',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    ...shorthands.padding('0', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    flexShrink: 0,
  },
});
