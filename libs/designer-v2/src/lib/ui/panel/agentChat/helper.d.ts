import { type ConversationItem } from '@microsoft/designer-ui';
import type { ChatHistory } from '@microsoft/logic-apps-shared';
export declare const parseChatHistory: (chatHistory: ChatHistory[], toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number, mcpToolName?: string) => void, toolContentCallback: (agentName: string, iteration: number) => void, agentCallback: (agentName: string) => void, isA2AWorkflow: boolean) => ConversationItem[];
export declare const useRefreshChatMutation: () => import("@tanstack/react-query").UseMutationResult<void, unknown, void, unknown>;
