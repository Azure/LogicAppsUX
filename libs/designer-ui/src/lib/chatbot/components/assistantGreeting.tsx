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
      defaultMessage: 'Welcome back! If you want me to change your flow, just say what you want. For example:',
      description: 'Chatbot greeting message from existing flow',
    }),
    suggestedPromptItem1: intl.formatMessage({
      defaultMessage: 'Add an action that sends an email',
      description: 'Chatbot suggested input for user',
    }),
    suggestedPromptItem2: intl.formatMessage({
      defaultMessage: 'Explain what an action does',
      description: 'Chatbot suggested input for user',
    }),
    suggestedPromptItem3: intl.formatMessage({
      defaultMessage: 'Add a condition',
      description: 'Chatbot suggested input prompt for user',
    }),
    saveYourFlow: intl.formatMessage({
      defaultMessage: 'Check the flow’s actions to see if any parameters need to be set. Don’t forget to save when you’re done!',
      description: 'Chatbot suggestion to user to check if parameters need to be set in the workflow actions and to save',
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
        <li>{intlText.suggestedPromptItem1}</li>
        <li>{intlText.suggestedPromptItem2}</li>
        <li>{intlText.suggestedPromptItem3}</li>
        <div style={{ marginTop: 12 }}>{intlText.saveYourFlow}</div>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
