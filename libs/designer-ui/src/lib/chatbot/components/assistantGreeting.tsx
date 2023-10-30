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
      defaultMessage: 'Welcome to Copilot in Azure Logic Apps!',
      description: 'Chatbot greeting message from existing flow',
    }),
    subHeading1: intl.formatMessage({
      defaultMessage: 'Copilot can help you learn about workflows and the Azure Logic Apps platform’s capabilities and connectors.',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    subHeading2: intl.formatMessage({
      defaultMessage: 'Some things you can say:',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    suggestedPromptItem1: intl.formatMessage({
      defaultMessage: 'Describe this workflow.',
      description: 'Chatbot suggestion message to describe the workflow',
    }),
    suggestedPromptItem2: intl.formatMessage({
      defaultMessage: 'Explain how to receive files from SFTP server.',
      description: 'Chatbot suggestion message to recieve specific files from SFTP server',
    }),
    suggestedPromptItem3: intl.formatMessage({
      defaultMessage: 'How can I call an external endpoint?',
      description: 'Chatbot suggestion message to call an external endpoint',
    }),
    suggestedPromptItem4: intl.formatMessage({
      defaultMessage: 'What is the concurrency setting of this workflow?',
      description: 'Chatbot suggestion message to get the concurrency setting of the workflow',
    }),
    outroMessage: intl.formatMessage({
      defaultMessage: 'Copilot is designed only to provide help and doesn’t support workflow creation or editing.',
      description: 'Chatbot disclaimer message that Copilot can only provide help and not modify workflows',
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
        <div style={{ marginBottom: 12 }}>{intlText.subHeading1}</div>
        <div>{intlText.subHeading2}</div>
        <li>{intlText.suggestedPromptItem1}</li>
        <li>{intlText.suggestedPromptItem2}</li>
        <li>{intlText.suggestedPromptItem3}</li>
        <li>{intlText.suggestedPromptItem4}</li>
        <div style={{ marginTop: 12 }}>{intlText.outroMessage}</div>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
