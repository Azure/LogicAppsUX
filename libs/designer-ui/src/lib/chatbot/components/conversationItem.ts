import type { OperationInfo } from './flowDiffPreview';

export enum FlowOrigin {
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

type BaseAssistantMessageItem = BaseConversationItem & {
  openFeedback?: () => void;
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

export type AssistantGreetingItem = BaseAssistantMessageItem & {
  type: ConversationItemType.Greeting;
  origin: FlowOrigin;
  reaction: ChatEntryReaction | undefined;
};

export type AssistantErrorItem = BaseAssistantMessageItem & {
  type: ConversationItemType.ReplyError;
  error: any;
  reaction: ChatEntryReaction | undefined;
  chatSessionId: string;
  __rawRequest: any;
  __rawResponse: any;
};

export type AssistantReplyItem = BaseAssistantMessageItem & {
  type: ConversationItemType.Reply;
  text: string;
  reaction: ChatEntryReaction | undefined;
  isMarkdownText: boolean;
  correlationId?: string;
  hideFooter?: boolean;
  __rawRequest: any;
  __rawResponse: any;
};

export type ConnectionsSetupItem = BaseAssistantMessageItem & {
  type: ConversationItemType.ConnectionsSetup;
  // connectionReferences: ConnectionReference[]; // TODO: Later change this to Record<string, ConnectionReference>
  // connectionReferencesNeedingSetup: string[];
  reaction: ChatEntryReaction | undefined;
  // The setup UX is displayed until connections are setup or the user skips.
  isSetupComplete: boolean;
  correlationId?: string;
};

export type AssistantReplyWithFlowItem = BaseAssistantMessageItem & {
  type: ConversationItemType.ReplyWithFlow;
  text: string;
  reaction: ChatEntryReaction | undefined;
  undoStatus: UndoStatus;
  correlationId?: string;
  __rawRequest: any;
  __rawResponse: any;
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

export type OperationsNeedingAttentionItem = BaseAssistantMessageItem & {
  type: ConversationItemType.OperationsNeedingAttention;
  userAction: OperationsNeedingAttentionOnUserAction;
  operationsNeedingAttention: OperationInfo[];
  reaction: ChatEntryReaction | undefined;
};
