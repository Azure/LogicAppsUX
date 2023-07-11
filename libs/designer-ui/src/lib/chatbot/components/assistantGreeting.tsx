import { ChatBubble } from './chatBubble';
import type { AssistantGreetingItem } from './conversationItem';
import { FlowOrigin } from './conversationItem';
import { FeedbackMessage } from './feedbackMessage';
import React from 'react';
import { useIntl } from 'react-intl';

export const AssistantGreeting = ({ item }: { item: AssistantGreetingItem }) => {
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
        selectedReaction={item.reaction}
        onThumbsReactionClicked={(reaction) => reaction} // TODO: add onMessageReactionClicked(item, reaction)}
        // TODO: add disabled={isBlockingOperationInProgress}
        isEmphasized={true}
      >
        <div style={{ marginBottom: 12 }}>{getSpecificGreetingPart(item.origin)}</div>
        <li>{intlText.suggestedPromptItem1}</li>
        <li>{intlText.suggestedPromptItem2}</li>
        <li>{intlText.suggestedPromptItem3}</li>
        <div style={{ marginTop: 12 }}>{intlText.saveYourFlow}</div>
      </ChatBubble>
      <FeedbackMessage item={item} />
    </div>
  );
};
