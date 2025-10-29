import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  subscriptionCombobox: {
    width: '100%',
    overflow: 'hidden',
  },
  openAIContainer: {
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
  },
  openAICombobox: {
    height: '25px',
    fontSize: tokens.fontSizeBase200,
    borderRadius: '0px',
    width: '100%',
    overflow: 'hidden',
    color: tokens.colorNeutralForeground1,
    ...shorthands.borderColor(tokens.colorNeutralStroke1),
  },
  createNewButton: {
    float: 'right',
    fontSize: tokens.fontSizeBase100,
    fontStyle: 'italic',
    paddingRight: tokens.spacingHorizontalXS,
  },
  comboxbox: {
    width: '98%',
  },
  comboboxFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
  },
  multilineMessageBar: {
    display: 'block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    lineHeight: '1.5',
  },
  spinner: {
    position: 'absolute',
    bottom: '6px',
    left: '8px',
  },
  refreshButton: {
    margin: `0 ${tokens.spacingHorizontalXS}`,
    height: '100%',
  },
  navigateIcon: {
    position: 'relative',
    top: '2px',
    left: '2px',
  },
  roleMessageContainer: {
    flexGrow: 1,
  },
});
