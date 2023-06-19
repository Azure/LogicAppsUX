export type ConversationItem = //TODO: Add other types of items
  UserQueryItem;
// | AssistantReplyItem
// | AssistantReplyWithFlowItem
// | AssistantGreetingItem
// | AssistantErrorItem
// | ConnectionsSetupItem
// | OperationsNeedingAttentionItem;

type BaseConversationItem = {
  type: ConversationItemType;
  id: string;
  date: Date;
};

export enum ConversationItemType {
  Query = 'query',
  Reply = 'reply',
  ReplyWithFlow = 'replyWithFlow',
  ReplyError = 'replyError',
  ConnectionsSetup = 'connectionsSetup',
  Greeting = 'greeting',
  OperationsNeedingAttention = 'operationsNeedingAttention',
}

export type UserQueryItem = BaseConversationItem & {
  type: ConversationItemType.Query;
  text: string;
};

export function isUserQueryItem(item: ConversationItem): item is UserQueryItem {
  return item.type === ConversationItemType.Query;
}
