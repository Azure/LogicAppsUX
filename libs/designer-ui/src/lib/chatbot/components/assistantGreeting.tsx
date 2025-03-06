import { useFeedbackMessage } from '../feedbackHelper';
import { ChatBubble } from './chatBubble';
import type { AssistantGreetingItem } from './conversationItem';
import { FlowOrigin } from './conversationItem';
import { useIntl } from 'react-intl';

export const AssistantGreeting = ({ item }: { item: AssistantGreetingItem }) => {
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const intl = useIntl();
  const intlText = {
    greetingMessageFromOpenedFlow: intl.formatMessage({
      defaultMessage: 'Welcome to the workflow assistant!',
      id: '62ec69ae6def',
      description: 'Chatbot greeting message from existing flow',
    }),
    subHeading1: intl.formatMessage({
      defaultMessage: `This assistant can help you learn about your workflows and Azure Logic Apps platform's capabilities and connectors.`,
      id: '78ed61fe19e7',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    subHeading2: intl.formatMessage({
      defaultMessage: 'Some things you can ask:',
      id: '9048e64f12ba',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    suggestedPromptItem1: intl.formatMessage({
      defaultMessage: 'Describe this workflow.',
      id: 'a397d8572b97',
      description: 'Chatbot suggestion message to describe the workflow',
    }),
    suggestedPromptItem2: intl.formatMessage({
      defaultMessage: 'Explain how to receive files from SFTP server.',
      id: '3e7b745e37a5',
      description: 'Chatbot suggestion message to recieve specific files from SFTP server',
    }),
    suggestedPromptItem3: intl.formatMessage({
      defaultMessage: 'How can I call an external endpoint?',
      id: '36124f527688',
      description: 'Chatbot suggestion message to call an external endpoint',
    }),
    suggestedPromptItem4: intl.formatMessage({
      defaultMessage: 'What is the concurrency setting of this workflow?',
      id: '58c5f68a0b84',
      description: 'Chatbot suggestion message to get the concurrency setting of the workflow',
    }),
    outroMessage: intl.formatMessage({
      defaultMessage: `The workflow assistant is designed only to provide help and doesn't support workflow creation or editing.`,
      id: '67cb41152f33',
      description: 'Chatbot disclaimer message that workflow assistant can only provide help and not modify workflows',
    }),
  };

  const getSpecificGreetingPart = (origin: FlowOrigin) => {
    switch (origin) {
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
