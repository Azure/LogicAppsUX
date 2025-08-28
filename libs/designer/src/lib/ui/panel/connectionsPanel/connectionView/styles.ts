import { makeStyles, tokens } from '@fluentui/react-components';

// Base styles for the connections panel header
export const useConnectionViewStyles = makeStyles({
  appActionHeader: {
    margin: '0 -10px',
    padding: '24px 24px 16px',
    zIndex: 1,
    position: 'sticky',
    top: '0px',

    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colorNeutralBackground1,
  },
});
