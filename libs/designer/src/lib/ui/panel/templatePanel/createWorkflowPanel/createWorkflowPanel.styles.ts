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
  // Styles for CreateWorkflowPanelHeader
  templateDetailsToggle: {
    ...shorthands.padding(tokens.spacingVerticalS, '0'),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: 'fit-content',
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  templateDetailsToggleText: {
    marginRight: tokens.spacingHorizontalM,
  },
  descriptionWrapper: {
    ...shorthands.padding(tokens.spacingVerticalS, '0'),
  },
  descriptionRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
  },
  descriptionTitle: {
    minWidth: '100px',
    height: 'max-content',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  descriptionText: {
    fontSize: '12px',

    '& *': {
      ...shorthands.margin('0'),
    },
  },
});
