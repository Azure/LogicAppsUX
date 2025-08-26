import { makeStyles, shorthands } from '@fluentui/react-components';

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
    fontSize: '13px',
    borderRadius: '0px',
    width: '100%',
    overflow: 'hidden',
    color: '#323130',
    ...shorthands.borderColor('#838180'),
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
