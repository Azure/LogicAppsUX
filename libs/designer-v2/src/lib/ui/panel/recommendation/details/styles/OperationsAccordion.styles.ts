import { makeStyles } from '@fluentui/react-components';

export const useOperationsAccordionStyles = makeStyles({
  container: {
    flex: '1',
    overflow: 'auto',
  },
  accordionPanel: {
    padding: '8px 0px',
    margin: '0',
    borderTop: 'none',
  },
  accordionPanelWithMessage: {
    padding: '8px',
    margin: '0',
    borderTop: 'none',
  },
  messageBar: {
    marginBottom: '16px',
  },
});
