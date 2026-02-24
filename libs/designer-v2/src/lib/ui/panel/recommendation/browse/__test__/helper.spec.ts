import { describe, test, expect, vi } from 'vitest';
import { BrowseCategoryType, getActionCategories, getTriggerCategories } from '../helper';

vi.mock('@microsoft/logic-apps-shared', () => ({
  getIntl: vi.fn(() => ({
    formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
  })),
  a2aRequestOperation: { id: 'a2arequest', name: 'a2arequest' },
  recurrenceOperation: { id: 'recurrence', name: 'recurrence' },
  requestOperation: { id: 'request', name: 'request' },
  agentOperation: { id: 'agent', name: 'agent' },
}));

describe('browse helper', () => {
  describe('BrowseCategoryType', () => {
    test('should have IMMEDIATE type', () => {
      expect(BrowseCategoryType.IMMEDIATE).toBe('immediate');
    });

    test('should have BROWSE type', () => {
      expect(BrowseCategoryType.BROWSE).toBe('browse');
    });
  });

  describe('getTriggerCategories', () => {
    test('should return array of trigger categories', () => {
      const categories = getTriggerCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    test('should include manual trigger category', () => {
      const categories = getTriggerCategories();
      const manual = categories.find((c) => c.key === 'manual');

      expect(manual).toBeDefined();
      expect(manual?.type).toBe(BrowseCategoryType.IMMEDIATE);
      expect(manual?.operation).toBeDefined();
    });

    test('should include schedule trigger category', () => {
      const categories = getTriggerCategories();
      const schedule = categories.find((c) => c.key === 'schedule');

      expect(schedule).toBeDefined();
      expect(schedule?.type).toBe(BrowseCategoryType.IMMEDIATE);
    });

    test('should include chatMessage trigger category for A2A', () => {
      const categories = getTriggerCategories();
      const chatMessage = categories.find((c) => c.key === 'chatMessage');

      expect(chatMessage).toBeDefined();
      expect(chatMessage?.type).toBe(BrowseCategoryType.IMMEDIATE);
      expect(chatMessage?.operation).toBeDefined();
    });
  });

  describe('getActionCategories', () => {
    test('should return array of action categories', () => {
      const categories = getActionCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    test('should include favorites category', () => {
      const categories = getActionCategories();
      const favorites = categories.find((c) => c.key === 'favorites');

      expect(favorites).toBeDefined();
      expect(favorites?.type).toBe(BrowseCategoryType.BROWSE);
    });

    test('should include mcpServers category', () => {
      const categories = getActionCategories();
      const mcpServers = categories.find((c) => c.key === 'mcpServers');

      expect(mcpServers).toBeDefined();
      expect(mcpServers?.text).toBe('MCP servers');
      expect(mcpServers?.description).toBe('Invoke tools from MCP servers');
      expect(mcpServers?.type).toBe(BrowseCategoryType.BROWSE);
      expect(mcpServers?.connectorFilters?.connectorIds).toContain('connectionProviders/mcpclient');
    });

    test('should set mcpServers visible to false when isAddingAgentTool is false', () => {
      const categories = getActionCategories(false, false);
      const mcpServers = categories.find((c) => c.key === 'mcpServers');

      expect(mcpServers?.visible).toBe(false);
    });

    test('should set mcpServers visible to true when isAddingAgentTool is true', () => {
      const categories = getActionCategories(false, true);
      const mcpServers = categories.find((c) => c.key === 'mcpServers');

      expect(mcpServers?.visible).toBe(true);
    });

    test('should set mcpServers visible to undefined when isAddingAgentTool is not provided', () => {
      const categories = getActionCategories();
      const mcpServers = categories.find((c) => c.key === 'mcpServers');

      expect(mcpServers?.visible).toBeUndefined();
    });

    test('should include aiAgent category', () => {
      const categories = getActionCategories();
      const aiAgent = categories.find((c) => c.key === 'aiAgent');

      expect(aiAgent).toBeDefined();
      expect(aiAgent?.type).toBe(BrowseCategoryType.IMMEDIATE);
      expect(aiAgent?.operation).toBeDefined();
    });

    test('should set aiAgent visible based on allowAgents parameter', () => {
      const categoriesWithAgents = getActionCategories(true);
      const aiAgentVisible = categoriesWithAgents.find((c) => c.key === 'aiAgent');
      expect(aiAgentVisible?.visible).toBe(true);

      const categoriesWithoutAgents = getActionCategories(false);
      const aiAgentHidden = categoriesWithoutAgents.find((c) => c.key === 'aiAgent');
      expect(aiAgentHidden?.visible).toBe(false);
    });

    test('should include dataTransformation category with correct connector filters', () => {
      const categories = getActionCategories();
      const dataTransformation = categories.find((c) => c.key === 'dataTransformation');

      expect(dataTransformation).toBeDefined();
      expect(dataTransformation?.type).toBe(BrowseCategoryType.BROWSE);
      expect(dataTransformation?.connectorFilters?.connectorIds).toContain('connectionProviders/variable');
      expect(dataTransformation?.connectorFilters?.connectorIds).toContain('connectionProviders/dataOperationNew');
    });

    test('should include simpleOperations category', () => {
      const categories = getActionCategories();
      const simpleOperations = categories.find((c) => c.key === 'simpleOperations');

      expect(simpleOperations).toBeDefined();
      expect(simpleOperations?.type).toBe(BrowseCategoryType.BROWSE);
    });

    test('should include humanInTheLoop category', () => {
      const categories = getActionCategories();
      const humanInTheLoop = categories.find((c) => c.key === 'humanInTheLoop');

      expect(humanInTheLoop).toBeDefined();
      expect(humanInTheLoop?.type).toBe(BrowseCategoryType.BROWSE);
      expect(humanInTheLoop?.connectorFilters?.name).toContain('approval');
      expect(humanInTheLoop?.connectorFilters?.name).toContain('teams');
    });
  });
});
