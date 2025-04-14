import { AgentMessageEntryType, ConversationItemType, type ConversationItem } from '@microsoft/designer-ui';
import { guid, labelCase } from '@microsoft/logic-apps-shared';
import type { ChatHistory } from '../../../core/queries/runs';

export const parseChatHistory = (
  chatHistory: ChatHistory[],
  toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number) => void,
  toolContentCallback: (agentName: string, iteration: number) => void,
  agentCallback: (agentName: string) => void
): ConversationItem[] => {
  // Improved version for processing chatHistory into conversations:
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
      const { iteration } = message;

      if (lastIteration !== iteration) {
        messageCountInIteration = 0;
        lastIteration = iteration;
      } else {
        messageCountInIteration++;
      }

      const dataScrollTarget = `${nodeId}-${iteration}-${messageCountInIteration}`;
      processedMessages.push(parseMessage(message, nodeId, dataScrollTarget, toolResultCallback, toolContentCallback));
    }

    // Restore original message order and append the agent header item
    return [
      ...processedMessages.reverse(),
      {
        id: guid(),
        text: labelCase(nodeId),
        type: ConversationItemType.AgentHeader,
        onClick: () => agentCallback(nodeId),
        date: new Date(), // Uses current time for header; update if needed
      },
    ];
  });

  return conversations;
};

const parseMessage = (
  message: any,
  parentId: string,
  dataScrollTarget: string,
  toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number) => void,
  toolContentCallback: (agentName: string, iteration: number) => void
): ConversationItem => {
  const { messageEntryType, messageEntryPayload, timestamp, role, iteration } = message;

  switch (messageEntryType) {
    case AgentMessageEntryType.Content: {
      const content = messageEntryPayload?.content || '';
      const isUserMessage = role === 'User';
      const type = isUserMessage ? ConversationItemType.Query : ConversationItemType.Reply;
      return {
        text: content,
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
        text: toolName,
        type: ConversationItemType.Tool,
        onClick: () => toolResultCallback(parentId, toolName, iteration, subIteration),
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
        role,
        hideFooter: true,
        metadata: { parentId },
        date: new Date(timestamp),
        isMarkdownText: false,
      };
    }
  }
};
