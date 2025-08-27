import { makeStyles, tokens } from '@fluentui/react-components';

export const useOperationsAccordionStyles = makeStyles({
  container: {
    flex: '1',
    overflow: 'auto',
  },
  accordionHeader: {
    // Fix border cutoff issue by ensuring proper border handling
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&[data-expand-state="expanded"]': {
      borderBottom: 'none', // Remove border when expanded to prevent cutoff
    },
  },
  accordionPanel: {
    padding: '0',
    margin: '0',
    borderTop: 'none', // Prevent double border with header
  },
  accordionPanelWithMessage: {
    padding: '8px',
    margin: '0',
    borderTop: 'none', // Prevent double border with header
  },
  messageBar: {
    marginBottom: '16px',
    whiteSpace: 'normal',
  },
});
