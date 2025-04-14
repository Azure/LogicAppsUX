import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseChatHistory } from '../helper';
import { AgentMessageEntryType, ConversationItemType } from '@microsoft/designer-ui';

describe('parseChatHistory', () => {
  // Create mock functions for the callbacks
  const toolResultCallback = vi.fn();
  const toolContentCallback = vi.fn();
  const agentCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty array when chatHistory is empty', () => {
    const result = parseChatHistory([], toolResultCallback, toolContentCallback, agentCallback);
    expect(result).toEqual([]);
  });

  it('should return an empty array when a chatHistory node has no messages', () => {
    const chatHistory = [{ nodeId: 'node1', messages: [] }];
    const result = parseChatHistory(chatHistory, toolResultCallback, toolContentCallback, agentCallback);
    expect(result).toEqual([]);
  });

  it('should process a single user content message correctly', () => {
    const timestamp = '2020-01-01T00:00:00Z';
    const message = {
      iteration: 1,
      messageEntryType: AgentMessageEntryType.Content,
      messageEntryPayload: { content: 'Hello world' },
      timestamp,
      role: 'User',
    };
    const chatHistory = [{ nodeId: 'node1', messages: [message] }];

    const result = parseChatHistory(chatHistory, toolResultCallback, toolContentCallback, agentCallback);

    // There should be one processed message plus one agent header = 2 items.
    expect(result.length).toBe(2);
    const [conversationItem, agentHeader] = result as any;

    // Verify conversation item properties
    expect(conversationItem.text).toBe('Hello world');
    expect(conversationItem.type).toBe(ConversationItemType.Query); // User messages become queries
    expect(conversationItem.dataScrollTarget).toBe('node1-1-0');
    expect(new Date(conversationItem.date).toISOString()).toBe(new Date(timestamp).toISOString());
    expect(conversationItem.role.agentName).toBe('node1');
    expect(typeof conversationItem.role.onClick).toBe('function');

    // Simulate clicking the onClick for the content role callback
    conversationItem.role.onClick();
    expect(toolContentCallback).toHaveBeenCalledWith('node1', 1);

    // Verify agent header properties
    expect(agentHeader.type).toBe(ConversationItemType.AgentHeader);
    expect(agentHeader.text).toBe('node1');
    expect(typeof agentHeader.onClick).toBe('function');
    agentHeader.onClick();
    expect(agentCallback).toHaveBeenCalledWith('node1');
  });

  it('should process a tool result message correctly', () => {
    const timestamp = '2021-02-02T00:00:00Z';
    const message = {
      iteration: 2,
      messageEntryType: AgentMessageEntryType.ToolResult,
      toolResultsPayload: {
        toolResult: {
          subIteration: 1,
          toolName: 'sampleTool',
          status: 'completed',
        },
      },
      timestamp,
      role: 'Agent',
    };
    const chatHistory = [{ nodeId: 'node2', messages: [message] }];

    const result = parseChatHistory(chatHistory, toolResultCallback, toolContentCallback, agentCallback);
    expect(result.length).toBe(2);
    const [toolItem] = result as any;
    expect(toolItem.text).toBe('sampleTool');
    expect(toolItem.type).toBe(ConversationItemType.Tool);
    expect(toolItem.dataScrollTarget).toBe('node2-2-0');
    expect(new Date(toolItem.date).toISOString()).toBe(new Date(timestamp).toISOString());
    expect(typeof toolItem.onClick).toBe('function');

    // Invoke the tool result callback via onClick
    toolItem.onClick();
    expect(toolResultCallback).toHaveBeenCalledWith('node2', 'sampleTool', 2, 1);
  });

  it('should process multiple messages in the same iteration correctly', () => {
    const message1 = {
      iteration: 1,
      messageEntryType: AgentMessageEntryType.Content,
      messageEntryPayload: { content: 'First message' },
      timestamp: '2022-03-03T00:00:00Z',
      role: 'User',
    };
    const message2 = {
      iteration: 1,
      messageEntryType: AgentMessageEntryType.Content,
      messageEntryPayload: { content: 'Second message' },
      timestamp: '2022-03-03T01:00:00Z',
      role: 'Agent',
    };
    const chatHistory = [{ nodeId: 'node3', messages: [message1, message2] }];

    const result = parseChatHistory(chatHistory, toolResultCallback, toolContentCallback, agentCallback);

    // Two messages plus one agent header = 3 items.
    expect(result.length).toBe(3);

    const [firstMsg, secondMsg, agentHeader] = result as any;

    // The messages should remain in the original order
    expect(firstMsg.text).toBe('First message');
    expect(secondMsg.text).toBe('Second message');

    // Verify the computed dataScrollTarget based on the reverse iteration logic
    // The backward iteration means message2 is processed first (gets count 0) and message1 is processed next (gets count 1)
    // After reversing, message1 appears first and its dataScrollTarget should include count 1
    expect(firstMsg.dataScrollTarget).toBe('node3-1-1');
    expect(secondMsg.dataScrollTarget).toBe('node3-1-0');

    // Agent header check
    expect(agentHeader.type).toBe(ConversationItemType.AgentHeader);
    expect(agentHeader.text).toBe('node3');
  });
});
