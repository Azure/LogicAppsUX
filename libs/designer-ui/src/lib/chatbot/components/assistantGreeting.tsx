import { useFeedbackMessage } from '../feedbackHelper';
import { useAssistantGreetingStyles } from './assistantGreeting.styles';
import { ChatBubble } from './chatBubble';
import type { AssistantGreetingItem } from './conversationItem';
import { FlowOrigin } from './conversationItem';
import { useIntl } from 'react-intl';

export const AssistantGreeting = ({ item }: { item: AssistantGreetingItem }) => {
  const styles = useAssistantGreetingStyles();
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const intl = useIntl();
  const intlText = {
    greetingMessageFromOpenedFlow: intl.formatMessage({
      defaultMessage: 'Welcome to the workflow assistant!',
      id: 'Yuxprm',
      description: 'Chatbot greeting message from existing flow',
    }),
    subHeading1: intl.formatMessage({
      defaultMessage: `This assistant can help you learn about your workflows and Azure Logic Apps platform's capabilities and connectors.`,
      id: 'eO1h/h',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    subHeading2: intl.formatMessage({
      defaultMessage: 'Some things you can ask:',
      id: 'kEjmTx',
      description: 'Chatbot introduction message to suggest what it can help with',
    }),
    suggestedPromptItem1: intl.formatMessage({
      defaultMessage: 'Describe this workflow.',
      id: 'o5fYVy',
      description: 'Chatbot suggestion message to describe the workflow',
    }),
    suggestedPromptItem2: intl.formatMessage({
      defaultMessage: 'Explain how to receive files from SFTP server.',
      id: 'Pnt0Xj',
      description: 'Chatbot suggestion message to recieve specific files from SFTP server',
    }),
    suggestedPromptItem3: intl.formatMessage({
      defaultMessage: 'How can I call an external endpoint?',
      id: 'NhJPUn',
      description: 'Chatbot suggestion message to call an external endpoint',
    }),
    suggestedPromptItem4: intl.formatMessage({
      defaultMessage: 'What is the concurrency setting of this workflow?',
      id: 'WMX2ig',
      description: 'Chatbot suggestion message to get the concurrency setting of the workflow',
    }),
    outroMessage: intl.formatMessage({
      defaultMessage: `The workflow assistant is designed only to provide help and doesn't support workflow creation or editing.`,
      id: 'Z8tBFS',
      description: 'Chatbot disclaimer message that workflow assistant can only provide help and not modify workflows',
    }),
  };

  const suggestedPrompts = [
    intlText.suggestedPromptItem1,
    intlText.suggestedPromptItem2,
    intlText.suggestedPromptItem3,
    intlText.suggestedPromptItem4,
  ];

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
        <div className={styles.textBlock}>{getSpecificGreetingPart(item.origin)}</div>
        <div className={styles.textBlock}>{intlText.subHeading1}</div>
        <div className={styles.subHeading}>{intlText.subHeading2}</div>
        <ul className={styles.suggestedPromptsList}>
          {suggestedPrompts.map((prompt, index) => (
            <li key={index} className={styles.suggestedPromptItem}>
              {prompt}
            </li>
          ))}
        </ul>
        <div>{intlText.outroMessage}</div>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
