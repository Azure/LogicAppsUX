import { useFeedbackMessage, useReportBugButton } from '../feedbackHelper';
import { AssistantError } from './assistantError';
import { AssistantGreeting } from './assistantGreeting';
import { AssistantReplyWithFlow } from './assistantReplyWithFlow';
import { ChatBubble } from './chatBubble';
import { ConnectionsSetupMessage } from './connectionsSetupMessage';
import { ConversationItemType } from './conversationItem';
import type { ConversationItem, UserQueryItem, AssistantReplyItem } from './conversationItem';
import { OperationsNeedingAttentionMessage } from './operationsNeedAttentionMessage';

type ConversationMessageProps = {
  item: ConversationItem;
};

export const ConversationMessage = ({ item }: ConversationMessageProps) => {
  switch (item.type) {
    case ConversationItemType.Query:
      return <UserMessage item={item} />;
    case ConversationItemType.Greeting:
      return <AssistantGreeting item={item} />;
    case ConversationItemType.Reply:
      return <AssistantReply item={item} />;
    case ConversationItemType.ReplyError:
      return <AssistantError item={item} />;
    case ConversationItemType.ReplyWithFlow:
      return <AssistantReplyWithFlow item={item} />;
    case ConversationItemType.ConnectionsSetup:
      return <ConnectionsSetupMessage item={item} />;
    case ConversationItemType.OperationsNeedingAttention:
      return <OperationsNeedingAttentionMessage item={item} />;
    default:
      return null;
  }
};

const UserMessage = ({ item }: { item: UserQueryItem }) => {
  return (
    <ChatBubble key={item.id} isUserMessage={true} isAIGenerated={false} date={item.date} isMarkdownMessage={false}>
      {item.text}
    </ChatBubble>
  );
};

const AssistantReply = ({ item }: { item: AssistantReplyItem }) => {
  const { id, isMarkdownText, text, hideFooter, date } = item;
  const reportBugButton = useReportBugButton(false);
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  return (
    <div>
      <ChatBubble
        key={id}
        isUserMessage={false}
        isAIGenerated={true}
        date={date}
        isMarkdownMessage={isMarkdownText}
        selectedReaction={reaction}
        onThumbsReactionClicked={(reaction) => onMessageReactionClicked(reaction)}
        disabled={false} //TODO: add isBlockingOperationInProgress}
        additionalFooterActions={hideFooter ? [] : [reportBugButton]}
        hideFooter={hideFooter}
      >
        <span style={{ whiteSpace: 'pre-line' }}>{text}</span>
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
