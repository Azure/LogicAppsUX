/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import panelReducer, { initialState } from '../panel/panelSlice';
import type { McpToolWizardState } from '../panel/panelTypes';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import {
  useMcpToolWizard,
  useMcpWizardStep,
  useMcpWizardOperation,
  useMcpWizardConnectionId,
  useMcpWizardAllowedTools,
  useMcpWizardHeaders,
} from '../panel/panelSelectors';

const mockMcpOperation: DiscoveryOperation<DiscoveryResultTypes> = {
  id: 'test-mcp-operation',
  name: 'Test MCP Operation',
  type: 'Discovery',
  properties: {
    summary: 'Test MCP Server',
    description: 'A test MCP server operation',
    api: {
      id: 'mcp-api-id',
      name: 'MCP API',
      displayName: 'MCP API',
      brandColor: '#000000',
      iconUri: 'https://example.com/icon.png',
    },
    operationType: 'McpClientTool',
  },
} as DiscoveryOperation<DiscoveryResultTypes>;

const createTestStore = (mcpToolWizard?: McpToolWizardState) => {
  return configureStore({
    reducer: {
      panel: panelReducer,
    },
    preloadedState: {
      panel: {
        ...initialState,
        discoveryContent: {
          ...initialState.discoveryContent,
          mcpToolWizard,
        },
      },
    },
  });
};

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
};

describe('panelSelectors - MCP Wizard', () => {
  describe('useMcpToolWizard', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpToolWizard(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the full mcpToolWizard state when set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'CONNECTION',
        connectionId: 'test-connection',
        allowedTools: ['tool1', 'tool2'],
        headers: { 'X-Custom': 'value' },
        isConnectionLocked: true,
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpToolWizard(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toEqual(wizardState);
    });
  });

  describe('useMcpWizardStep', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpWizardStep(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the currentStep when set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardStep(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe('PARAMETERS');
    });
  });

  describe('useMcpWizardOperation', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpWizardOperation(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the operation when set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'CONNECTION',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardOperation(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toEqual(mockMcpOperation);
    });
  });

  describe('useMcpWizardConnectionId', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpWizardConnectionId(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return undefined when connectionId is not set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'CONNECTION',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardConnectionId(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the connectionId when set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
        connectionId: 'my-connection-id',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardConnectionId(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe('my-connection-id');
    });
  });

  describe('useMcpWizardAllowedTools', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpWizardAllowedTools(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return undefined when allowedTools is not set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardAllowedTools(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the allowedTools array when set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
        allowedTools: ['tool1', 'tool2', 'tool3'],
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardAllowedTools(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toEqual(['tool1', 'tool2', 'tool3']);
    });
  });

  describe('useMcpWizardHeaders', () => {
    it('should return undefined when mcpToolWizard is not set', () => {
      const store = createTestStore(undefined);
      const { result } = renderHook(() => useMcpWizardHeaders(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return undefined when headers is not set', () => {
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardHeaders(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBeUndefined();
    });

    it('should return the headers when set', () => {
      const headers = {
        Authorization: 'Bearer token',
        'X-Custom-Header': 'custom-value',
      };
      const wizardState: McpToolWizardState = {
        operation: mockMcpOperation,
        currentStep: 'PARAMETERS',
        headers,
      };
      const store = createTestStore(wizardState);
      const { result } = renderHook(() => useMcpWizardHeaders(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toEqual(headers);
    });
  });
});
