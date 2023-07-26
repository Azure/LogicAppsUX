import { AssistantError } from './assistantError';
import { AssistantGreeting } from './assistantGreeting';
import { AssistantReplyWithFlow } from './assistantReplyWithFlow';
import { ChatBubble } from './chatBubble';
import { ConnectionsSetupMessage } from './connectionsSetupMessage';
import { ConversationItemType } from './conversationItem';
import type { ConversationItem, UserQueryItem, AssistantReplyItem } from './conversationItem';
import { FeedbackMessage } from './feedbackMessage';
import { OperationsNeedingAttentionMessage } from './operationsNeedAttentionMessage';

type ConversationMessageProps = {
  item: ConversationItem;
};

export const ConversationMessage = ({ item }: ConversationMessageProps) => {
  switch (item.type) {
    case ConversationItemType.Query:
      return <UserMessage item={item} />; // TODO: Add other types of conversation items here
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
  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={true}
        date={item.date}
        isMarkdownMessage={item.isMarkdownText}
        selectedReaction={item.reaction}
        onThumbsReactionClicked={(reaction) => reaction} // TODO: add onMessageReactionClicked(item, reaction)}
        disabled={false} //TODO: add isBlockingOperationInProgress}
        footerActions={
          //TODO: add check for isUsingDebugOptions
          [
            {
              text: 'Report a bug',
              //TODO: add onClick: () => onReportBugClick(item),
              iconProps: { iconName: 'Bug' },
            },
          ]
        }
      >
        {item.text}
      </ChatBubble>
      <FeedbackMessage item={item} />
    </div>
  );
};
