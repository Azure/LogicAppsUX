import type { OperationInfo } from './flowDiffPreview';

export enum FlowOrigin {
  FromNL2Flow = 'fromNL2Flow',
  // We may want to define other flow origins in future
  Default = 'default',
}

export enum ChatEntryReaction {
  thumbsUp = 'thumbsUp',
  thumbsDown = 'thumbsDown',
}

export type ConversationItem = //TODO: Add other types of items

    | UserQueryItem
    | AssistantReplyItem
    | AssistantReplyWithFlowItem
    | AssistantGreetingItem
    | AssistantErrorItem
    | ConnectionsSetupItem
    | OperationsNeedingAttentionItem;

export type ReactionItem =
  | AssistantReplyItem
  | AssistantReplyWithFlowItem
  | AssistantGreetingItem
  | AssistantErrorItem
  | ConnectionsSetupItem
  | OperationsNeedingAttentionItem;

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

export type AssistantGreetingItem = BaseConversationItem & {
  type: ConversationItemType.Greeting;
  origin: FlowOrigin;
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
};

export type AssistantErrorItem = BaseConversationItem & {
  type: ConversationItemType.ReplyError;
  error: unknown;
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
  chatSessionId: string;
  __rawRequest: unknown;
  __rawResponse: unknown;
};

export type AssistantReplyItem = BaseConversationItem & {
  type: ConversationItemType.Reply;
  text: string;
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
  isMarkdownText: boolean;
  correlationId?: string;
  __rawRequest: unknown;
  __rawResponse: unknown;
};

export type ConnectionsSetupItem = BaseConversationItem & {
  type: ConversationItemType.ConnectionsSetup;
  // connectionReferences: ConnectionReference[]; // TODO: Later change this to Record<string, ConnectionReference>
  // connectionReferencesNeedingSetup: string[];
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
  // The setup UX is displayed until connections are setup or the user skips.
  isSetupComplete: boolean;
  correlationId?: string;
};

export type AssistantReplyWithFlowItem = BaseConversationItem & {
  type: ConversationItemType.ReplyWithFlow;
  text: string;
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
  undoStatus: UndoStatus;
  correlationId?: string;
  __rawRequest: unknown;
  __rawResponse: unknown;
};

export enum UndoStatus {
  Unavailable = 0,
  UndoAvailable,
  Undone,
}

export enum OperationsNeedingAttentionOnUserAction {
  editing = 1,
  saving,
}

export type OperationsNeedingAttentionItem = BaseConversationItem & {
  type: ConversationItemType.OperationsNeedingAttention;
  userAction: OperationsNeedingAttentionOnUserAction;
  operationsNeedingAttention: OperationInfo[];
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
};
