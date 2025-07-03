import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  drawer: {
    zIndex: 1000,
    height: '100%',
  },
  header: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
  },
  body: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
    overflow: 'auto',
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
  closeButton: {
    minWidth: 'auto',
    flexShrink: 0,
  },
  // Styles for QuickViewPanelHeader
  tagsContainer: {
    display: 'flex',
    flexDirection: 'row',
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('10px', '0', '10px', '0'),
  },
  lastTag: {
    verticalAlign: 'middle',
  },
  sourceCodeLink: {
    paddingLeft: tokens.spacingHorizontalL,
    display: 'inline-flex',
    flexDirection: 'row',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCodeIcon: {
    paddingLeft: '4px',
  },
  featuresSection: {
    paddingTop: '10px',
  },
  markdownContent: {
    '& *': {
      ...shorthands.margin('0'),
    },
    '& a': {
      color: tokens.colorBrandForegroundLink,
    },
  },
  quickviewTabs: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
});
