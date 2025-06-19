import { makeStyles } from '@fluentui/react-components';

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
    width: '100%',
    overflow: 'hidden',
  },
  createNewButton: {
    float: 'right',
    fontSize: '12px',
    fontStyle: 'italic',
    paddingRight: '4px',
  },
  comboxbox: {
    width: '98%',
  },
  comboboxFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  multilineMessageBar: {
    display: 'block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'anywhere',
    lineHeight: '1.5',
  },
});
