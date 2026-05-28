import { makeStyles, shorthands } from '@fluentui/react-components';

export const useAssistantGreetingStyles = makeStyles({
  suggestedPromptsList: {
    ...shorthands.margin('8px', '0', '12px', '0'),
    ...shorthands.padding('0', '0', '0', '20px'),
    listStyleType: 'disc',
  },

  suggestedPromptItem: {
    marginBottom: '4px',
  },

  textBlock: {
    marginBottom: '12px',
  },

  subHeading: {
    marginBottom: '4px',
  },
});
