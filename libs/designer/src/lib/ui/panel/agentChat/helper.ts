import { AgentMessageEntryType, ConversationItemType, type ConversationItem } from '@microsoft/designer-ui';
import type { ChatHistory, MessageEntry } from '@microsoft/logic-apps-shared';
import { guid, labelCase } from '@microsoft/logic-apps-shared';
import { useMutation } from '@tanstack/react-query';
import { getReactQueryClient, runsQueriesKeys } from '../../../core';

export const parseChatHistory = (
  chatHistory: ChatHistory[],
  toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number) => void,
  toolContentCallback: (agentName: string, iteration: number) => void,
  agentCallback: (agentName: string) => void,
  isA2AWorkflow: boolean
): ConversationItem[] => {
  const conversations: ConversationItem[] = chatHistory.flatMap(({ nodeId, messages }) => {
    if (!messages || messages.length === 0) {
      return [];
    }

    let lastIteration: number | undefined;
    let messageCountInIteration = 0;
    const processedMessages: ConversationItem[] = [];

    // Iterate backwards to properly count message occurrences per iteration
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const { iteration, agentMetadata } = message;
      const agentOperationId = isA2AWorkflow ? (agentMetadata?.agentName ?? '') : nodeId;

      if (lastIteration !== iteration) {
        messageCountInIteration = 0;
        lastIteration = iteration;
      } else {
        messageCountInIteration++;
      }

      const dataScrollTarget = `${agentOperationId}-${iteration}-${messageCountInIteration}`;
      processedMessages.push(
        parseMessage(message, agentOperationId, dataScrollTarget, toolResultCallback, toolContentCallback, isA2AWorkflow)
      );
    }

    const agentHeader = {
      id: guid(),
      text: labelCase(nodeId),
      type: ConversationItemType.AgentHeader,
      onClick: () => agentCallback(nodeId),
      date: new Date(),
    };

    // Restore original message order and conditionally append the agent header item
    return [...processedMessages.reverse(), ...(isA2AWorkflow ? [] : [agentHeader])];
  });

  return conversations;
};

const parseMessage = (
  message: MessageEntry,
  parentId: string,
  dataScrollTarget: string,
  toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number) => void,
  toolContentCallback: (agentName: string, iteration: number) => void,
  isA2AWorkflow: boolean
): ConversationItem => {
  const { messageEntryType, messageEntryPayload, timestamp, role, iteration } = message;
  switch (messageEntryType) {
    case AgentMessageEntryType.Content: {
      const content = messageEntryPayload?.content || '';
      const isUserMessage = role === 'User';
      const type = isUserMessage ? ConversationItemType.Query : ConversationItemType.Reply;
      return {
        text: labelCase(content),
        type,
        id: guid(),
        role: {
          text: isUserMessage ? undefined : role,
          agentName: labelCase(parentId),
          onClick: () => toolContentCallback(parentId, iteration),
        },
        hideFooter: true,
        metadata: { parentId },
        date: new Date(timestamp),
        isMarkdownText: false,
        className: 'msla-agent-chat-content',
        dataScrollTarget,
      };
    }
    case AgentMessageEntryType.ToolResult: {
      const subIteration = message.toolResultsPayload?.toolResult?.subIteration ?? 0;
      const toolName = message.toolResultsPayload?.toolResult?.toolName ?? '';
      const status = message.toolResultsPayload?.toolResult?.status;

      return {
        id: guid(),
        text: labelCase(toolName),
        type: ConversationItemType.Tool,
        onClick: isA2AWorkflow ? undefined : () => toolResultCallback(parentId, toolName, iteration, subIteration),
        status,
        date: new Date(timestamp),
        dataScrollTarget,
      };
    }
    default: {
      return {
        text: '',
        type: ConversationItemType.Reply,
        id: guid(),
        role: {
          text: role,
        },
        hideFooter: true,
        metadata: { parentId },
        date: new Date(timestamp),
        isMarkdownText: false,
      };
    }
  }
};

export const useRefreshChatMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const queryClient = getReactQueryClient();

      // Reset all queries
      await queryClient.resetQueries([runsQueriesKeys.useRunInstance]);
      await queryClient.resetQueries([runsQueriesKeys.useActionsChatHistory]);
      await queryClient.resetQueries([runsQueriesKeys.useRunChatHistory]);
      await queryClient.resetQueries([runsQueriesKeys.useAgentActionsRepetition]);
      await queryClient.resetQueries([runsQueriesKeys.useAgentRepetition]);
      await queryClient.resetQueries([runsQueriesKeys.useNodeRepetition]);

      // Refetch all queries
      await queryClient.refetchQueries([runsQueriesKeys.useRunInstance]);
      await queryClient.refetchQueries([runsQueriesKeys.useAgentRepetition]);
      await queryClient.refetchQueries([runsQueriesKeys.useAgentActionsRepetition]);
      await queryClient.refetchQueries([runsQueriesKeys.useNodeRepetition]);
      await queryClient.refetchQueries([runsQueriesKeys.useActionsChatHistory]);
      await queryClient.refetchQueries([runsQueriesKeys.useRunChatHistory]);
    },
  });
};
