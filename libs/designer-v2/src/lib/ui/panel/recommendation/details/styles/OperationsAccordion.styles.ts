import { makeStyles, tokens } from '@fluentui/react-components';

export const useOperationsAccordionStyles = makeStyles({
  container: {
    flex: '1',
    overflow: 'auto',
  },
  accordionHeader: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&[data-expand-state="expanded"]': {
      borderBottom: 'none',
    },
  },
  accordionPanel: {
    padding: '0',
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
    whiteSpace: 'normal',
  },
});
