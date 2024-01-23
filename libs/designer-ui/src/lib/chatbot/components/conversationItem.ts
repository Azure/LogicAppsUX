import type { OperationInfo } from './flowDiffPreview';

export const FlowOrigin = {
  Default: 'default',
} as const;
export type FlowOrigin = (typeof FlowOrigin)[keyof typeof FlowOrigin];

export const ChatEntryReaction = {
  thumbsUp: 'thumbsUp',
  thumbsDown: 'thumbsDown',
} as const;
export type ChatEntryReaction = (typeof ChatEntryReaction)[keyof typeof ChatEntryReaction];

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
  logFeedbackVote?: (reaction: ChatEntryReaction, isRemovedVote?: boolean) => void;
};

export const ConversationItemType = {
  Query: 'query',
  Reply: 'reply',
  ReplyWithFlow: 'replyWithFlow',
  ReplyError: 'replyError',
  ConnectionsSetup: 'connectionsSetup',
  Greeting: 'greeting',
  OperationsNeedingAttention: 'operationsNeedingAttention',
} as const;
export type ConversationItemType = (typeof ConversationItemType)[keyof typeof ConversationItemType];

export type UserQueryItem = BaseConversationItem & {
  type: typeof ConversationItemType.Query;
  text: string;
};

export function isUserQueryItem(item: ConversationItem): item is UserQueryItem {
  return item.type === ConversationItemType.Query;
}

export type AssistantGreetingItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.Greeting;
  origin: FlowOrigin;
  reaction: ChatEntryReaction | undefined;
};

export type AssistantErrorItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.ReplyError;
  error: any;
  reaction: ChatEntryReaction | undefined;
  chatSessionId: string;
  __rawRequest: any;
  __rawResponse: any;
};

export type AssistantReplyItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.Reply;
  text: string;
  reaction: ChatEntryReaction | undefined;
  isMarkdownText: boolean;
  correlationId?: string;
  hideFooter?: boolean;
  __rawRequest: any;
  __rawResponse: any;
  additionalDocURL?: string | undefined;
  azureButtonCallback?: (prompt?: string) => void;
};

export type ConnectionsSetupItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.ConnectionsSetup;
  // connectionReferences: ConnectionReference[]; // TODO: Later change this to Record<string, ConnectionReference>
  // connectionReferencesNeedingSetup: string[];
  reaction: ChatEntryReaction | undefined;
  // The setup UX is displayed until connections are setup or the user skips.
  isSetupComplete: boolean;
  correlationId?: string;
};

export type AssistantReplyWithFlowItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.ReplyWithFlow;
  text: string;
  reaction: ChatEntryReaction | undefined;
  undoStatus: UndoStatus;
  correlationId?: string;
  __rawRequest: any;
  __rawResponse: any;
};

export const UndoStatus = {
  Unavailable: 0,
  UndoAvailable: 1,
  Undone: 2,
} as const;
export type UndoStatus = (typeof UndoStatus)[keyof typeof UndoStatus];

export const OperationsNeedingAttentionOnUserAction = {
  editing: 1,
  saving: 2,
} as const;
export type OperationsNeedingAttentionOnUserAction =
  (typeof OperationsNeedingAttentionOnUserAction)[keyof typeof OperationsNeedingAttentionOnUserAction];

export type OperationsNeedingAttentionItem = BaseAssistantMessageItem & {
  type: typeof ConversationItemType.OperationsNeedingAttention;
  userAction: OperationsNeedingAttentionOnUserAction;
  operationsNeedingAttention: OperationInfo[];
  reaction: ChatEntryReaction | undefined;
};

export type AdditionalParametersItem = {
  sendToAzure: string | null;
  error: string | null;
  url: string | null;
};
