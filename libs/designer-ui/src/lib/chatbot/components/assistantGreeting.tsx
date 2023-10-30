import { useFeedbackMessage } from '../feedbackHelper';
import { ChatBubble } from './chatBubble';
import type { AssistantGreetingItem } from './conversationItem';
import { FlowOrigin } from './conversationItem';
import { useIntl } from 'react-intl';

export const AssistantGreeting = ({ item }: { item: AssistantGreetingItem }) => {
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const intl = useIntl();
  const intlText = {
    greetingMessageFromNL2Flow: intl.formatMessage({
      defaultMessage: 'Here’s your flow. If you want me to change it, just say what you want. For example:',
      description: 'Chatbot greeting message from NL2 flow',
    }),
    greetingMessageFromOpenedFlow: intl.formatMessage({
      defaultMessage: 'Welcome back! If you want me to change your flow, just say what you want. For example:',
      description: 'Chatbot greeting message from existing flow',
    }),
    saveYourFlow: intl.formatMessage({
      defaultMessage: 'Check the flow’s actions to see if any parameters need to be set. Don’t forget to save when you’re done!',
      description: 'Chatbot suggestion to user to check if parameters need to be set in the workflow actions and to save',
    }),
    Heading1: intl.formatMessage({
      defaultMessage: 'Welcome to Copilot in Azure Logic Apps!',
      description: 'Chatbot greeting message',
    }),
    SubHeading1: intl.formatMessage({
      defaultMessage: ' Copilot can help you with tasks such as the following:',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    suggestedAction1: intl.formatMessage({
      defaultMessage: 'Learn about workflows, the way they work, and how to create them.',
      description: 'Chatbot suggestion to user to learn about how their workflow works',
    }),
    suggestedAction2: intl.formatMessage({
      defaultMessage: 'Get details about Azure Logic Apps platform’s capabilities and connectors.',
      description: 'Chatbot suggestion to user to get help on Logic Apps platform capabilities as well as connectors',
    }),
    Outro1: intl.formatMessage({
      defaultMessage: 'Copilot is designed only to provide help and doesn’t support workflow creation or editing.',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    Heading2: intl.formatMessage({
      defaultMessage: 'Some things you can say:',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    suggestedPromptItem1: intl.formatMessage({
      defaultMessage: 'Describe this workflow',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    suggestedPromptItem2: intl.formatMessage({
      defaultMessage: 'How to receive files from SFTP server',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    suggestedPromptItem3: intl.formatMessage({
      defaultMessage: 'How to call an external endpoint',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    suggestedPromptItem4: intl.formatMessage({
      defaultMessage: 'What is the concurrency setting of this workflow',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
    }),
    FirstDisclaimer3: intl.formatMessage({
      defaultMessage: 'Copilot doesn’t edit or change your workflows.',
      description: 'Chatbot disclaimer message that Copilot does not modify workflows.',
    }),
    SecondDisclaimer3: intl.formatMessage({
      defaultMessage: 'Copilot doesn’t store or use your data.',
      description: 'Chatbot disclaimer message that Copilot does not gather data',
    }),
    saveYourFlow: intl.formatMessage({
      defaultMessage: 'Check the flow’s actions to see if any parameters need to be set. Don’t forget to save when you’re done!',
      description: 'Chatbot suggestion to user to check if parameters need to be set in the workflow actions and to save',
    }),
  };

  const getSpecificGreetingPart = (origin: FlowOrigin) => {
    switch (origin) {
      case FlowOrigin.FromNL2Flow:
        return intlText.greetingMessageFromNL2Flow;
      case FlowOrigin.Default:
      default:
        return intlText.greetingMessageFromOpenedFlow;
    }
  };
  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={true}
        date={item.date}
        selectedReaction={reaction}
        onThumbsReactionClicked={(reaction) => onMessageReactionClicked(reaction)}
        // TODO: add disabled={isBlockingOperationInProgress}
        isEmphasized={true}
        hideFooter={true}
      >
        <div style={{ marginBottom: 12 }}>{getSpecificGreetingPart(item.origin)}</div>
        <li>{intlText.suggestedPromptItem1}</li>
        <li>{intlText.suggestedPromptItem2}</li>
        <li>{intlText.suggestedPromptItem3}</li>
        <div style={{ marginTop: 12 }}>{intlText.saveYourFlow}</div>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
