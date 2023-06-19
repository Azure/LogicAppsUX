import { ChatBubble } from './chatBubble';
import type { ChatResources } from './chatResources';
import { ConversationItemType } from './conversationItem';
import type { ConversationItem, UserQueryItem } from './conversationItem';

type ConversationMessageProps = {
  item: ConversationItem;
  resources?: ChatResources;
};

export const ConversationMessage = ({ item, resources }: ConversationMessageProps) => {
  switch (item.type) {
    case ConversationItemType.Query:
      return <UserMessage item={item} resources={resources} />; // TODO: Add other types of conversation items here
    default:
      return null;
  }
};

const UserMessage = ({ item, resources }: { item: UserQueryItem; resources?: ChatResources }) => {
  return (
    <ChatBubble key={item.id} isUserMessage={true} isAIGenerated={false} date={item.date} isMarkdownMessage={false} resources={resources}>
      {item.text}
    </ChatBubble>
  );
};
