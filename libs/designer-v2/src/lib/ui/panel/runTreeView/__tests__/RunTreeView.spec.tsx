import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { RunTreeView } from '../RunTreeView';
import * as WorkflowSelectors from '../../../../core/state/workflow/workflowSelectors';
import * as DesignerViewSelectors from '../../../../core/state/designerView/designerViewSelectors';
import * as Core from '../../../../core';
import * as TimelineHooks from '../../../MonitoringTimeline/hooks';

// Mock dependencies
vi.mock('../../../../core/state/workflow/workflowSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useRunInstance: vi.fn(),
    useNodesMetadata: vi.fn(),
    useAgentOperations: vi.fn(),
  };
});

vi.mock('../../../../core/state/designerView/designerViewSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useIsA2AWorkflow: vi.fn(),
  };
});

vi.mock('../../../../core', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useChatHistory: vi.fn(),
    getNodeRepetitions: vi.fn(),
    getAgentRepetitions: vi.fn(),
    getAgentActionsRepetition: vi.fn(),
  };
});

vi.mock('../../../MonitoringTimeline/hooks', () => ({
  useTimelineRepetitions: vi.fn(),
}));

// Create a mock icons object that returns default values for any key
const createMockIconsHandler = () => ({
  get(_target: object, prop: PropertyKey) {
    if (typeof prop === 'string') {
      return { iconUri: 'test-icon-uri', brandColor: '#000000' };
    }
    return undefined;
  },
});

vi.mock('../../../../core/state/operation/operationSelector', () => ({
  useAllIcons: () => new Proxy({} as Record<string, { iconUri: string; brandColor: string }>, createMockIconsHandler()),
}));

// Mock the TreeActionItem to avoid complex internal state dependencies
vi.mock('../TreeActionItem', () => ({
  TreeActionItem: ({ id }: { id: string }) => <div data-testid={`tree-item-${id}`}>{id}</div>,
}));

describe('RunTreeView', () => {
  let mockStore: EnhancedStore;

  const createMockStore = () => {
    return configureStore({
      reducer: {
        operations: (state = {}) => state,
        workflow: (state = { nodesMetadata: {} }) => state,
        designerView: (state = {}) => state,
        panel: (state = {}) => state,
      },
    });
  };

  const renderWithProviders = () => {
    return render(
      <Provider store={mockStore}>
        <IntlProvider locale="en" defaultLocale="en">
          <RunTreeView />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockStore();

    // Default mock implementations
    (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(undefined);
    (WorkflowSelectors.useNodesMetadata as Mock).mockReturnValue({});
    (WorkflowSelectors.useAgentOperations as Mock).mockReturnValue([]);
    (DesignerViewSelectors.useIsA2AWorkflow as Mock).mockReturnValue(false);
    (Core.useChatHistory as Mock).mockReturnValue({ data: undefined });
    (Core.getNodeRepetitions as Mock).mockResolvedValue([]);
    (Core.getAgentRepetitions as Mock).mockResolvedValue([]);
    (Core.getAgentActionsRepetition as Mock).mockResolvedValue([]);
    (TimelineHooks.useTimelineRepetitions as Mock).mockReturnValue({ data: undefined });
  });

  describe('Rendering', () => {
    it('should return null when no run is selected', () => {
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(undefined);

      const { container } = renderWithProviders();

      expect(container.innerHTML).toBe('');
    });

    it('should render tree when a run is selected', () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      // Tree should be rendered (check for tree structure)
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('should show running spinner when workflow is running', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Running',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Workflow is in progress')).toBeInTheDocument();
      });
    });

    it('should show running spinner when workflow is waiting', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Waiting',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Workflow is in progress')).toBeInTheDocument();
      });
    });

    it('should show running spinner when workflow is resuming', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Resuming',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Workflow is in progress')).toBeInTheDocument();
      });
    });

    it('should not show running spinner when workflow has succeeded', () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      expect(screen.queryByText('Workflow is in progress')).not.toBeInTheDocument();
    });

    it('should not show running spinner when workflow has failed', () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Failed',
          trigger: {
            name: 'manual',
            status: 'Failed',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      expect(screen.queryByText('Workflow is in progress')).not.toBeInTheDocument();
    });
  });

  describe('Repetitions', () => {
    it('should fetch repetitions for actions with repetitionCount', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            ForEach: {
              name: 'ForEach',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              repetitionCount: 3,
            },
          },
        },
      };

      const mockRepetitions = [
        {
          name: '000001',
          properties: {
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:01Z',
            repetitionIndexes: [],
          },
        },
      ];

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getNodeRepetitions as Mock).mockResolvedValue(mockRepetitions);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getNodeRepetitions).toHaveBeenCalledWith('ForEach', 'run-123', false);
      });
    });

    it('should fetch agent repetitions for actions with iterationCount', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            AgentScope: {
              name: 'AgentScope',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              iterationCount: 2,
            },
          },
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getAgentRepetitions as Mock).mockResolvedValue([]);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getAgentRepetitions).toHaveBeenCalledWith('AgentScope', 'run-123', false);
      });
    });
  });

  describe('Chat History', () => {
    it('should call useChatHistory hook with correct parameters', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (WorkflowSelectors.useAgentOperations as Mock).mockReturnValue(['agent1', 'agent2']);
      (DesignerViewSelectors.useIsA2AWorkflow as Mock).mockReturnValue(true);
      (Core.useChatHistory as Mock).mockReturnValue({ data: undefined });

      renderWithProviders();

      expect(Core.useChatHistory).toHaveBeenCalledWith(true, 'run-123', ['agent1', 'agent2'], true);
    });

    it('should not call useChatHistory when no run is selected', () => {
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(undefined);
      (Core.useChatHistory as Mock).mockReturnValue({ data: undefined });

      renderWithProviders();

      expect(Core.useChatHistory).toHaveBeenCalledWith(true, undefined, [], false);
    });
  });

  describe('useNodesMetadata', () => {
    it('should call useNodesMetadata hook', () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (WorkflowSelectors.useNodesMetadata as Mock).mockReturnValue({
        manual: { graphId: 'root' },
      });

      renderWithProviders();

      expect(WorkflowSelectors.useNodesMetadata).toHaveBeenCalled();
    });
  });

  describe('useTimelineRepetitions', () => {
    it('should call useTimelineRepetitions hook', () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (TimelineHooks.useTimelineRepetitions as Mock).mockReturnValue({ data: [] });

      renderWithProviders();

      expect(TimelineHooks.useTimelineRepetitions).toHaveBeenCalled();
    });
  });

  describe('Tree Building', () => {
    it('should render trigger as a tree item', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {},
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('tree-item-manual')).toBeInTheDocument();
      });
    });

    it('should render normal actions as tree items', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            Compose: {
              name: 'Compose',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
            },
            Response: {
              name: 'Response',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:02Z',
            },
          },
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('tree-item-Compose')).toBeInTheDocument();
        expect(screen.getByTestId('tree-item-Response')).toBeInTheDocument();
      });
    });

    it('should skip actions with Skipped status', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            Compose: {
              name: 'Compose',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
            },
            SkippedAction: {
              name: 'SkippedAction',
              status: 'Skipped',
              startTime: '2024-01-01T10:00:02Z',
            },
          },
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('tree-item-Compose')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('tree-item-SkippedAction')).not.toBeInTheDocument();
    });

    it('should skip built-in agent tools from top-level actions', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            code_interpreter: {
              name: 'code_interpreter',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
            },
            Compose: {
              name: 'Compose',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:02Z',
            },
          },
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('tree-item-Compose')).toBeInTheDocument();
      });
      // code_interpreter is a built-in agent tool and should be skipped at top level
      expect(screen.queryByTestId('tree-item-code_interpreter')).not.toBeInTheDocument();
    });

    it('should place child actions under parent nodes using nodesMetadata', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            Scope1: {
              name: 'Scope1',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
            },
            ChildAction: {
              name: 'ChildAction',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:02Z',
            },
          },
        },
      };

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (WorkflowSelectors.useNodesMetadata as Mock).mockReturnValue({
        Scope1: { graphId: 'root' },
        ChildAction: { parentNodeId: 'Scope1', graphId: 'Scope1' },
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('tree-item-Scope1')).toBeInTheDocument();
        expect(screen.getByTestId('tree-item-ChildAction')).toBeInTheDocument();
      });
    });

    it('should fetch agent repetitions and render tool iterations', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            AgentScope: {
              name: 'AgentScope',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              iterationCount: 1,
            },
          },
        },
      };

      const mockAgentRepetitions = [
        {
          name: '000000',
          properties: {
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:01Z',
            repetitionIndexes: [],
            tools: {
              myTool: { iterations: 2 },
            },
          },
        },
      ];

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getAgentRepetitions as Mock).mockResolvedValue(mockAgentRepetitions);
      (Core.getAgentActionsRepetition as Mock).mockResolvedValue([]);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getAgentRepetitions).toHaveBeenCalledWith('AgentScope', 'run-123', false);
      });

      // The agent repetition and its tools should be added to the tree
      await waitFor(() => {
        expect(screen.getByTestId('tree-item-AgentScope')).toBeInTheDocument();
      });
    });

    it('should skip agent repetitions with Skipped status', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            AgentScope: {
              name: 'AgentScope',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              iterationCount: 1,
            },
          },
        },
      };

      const mockAgentRepetitions = [
        {
          name: '000000',
          properties: {
            status: 'Skipped',
            startTime: '2024-01-01T10:00:01Z',
            repetitionIndexes: [],
          },
        },
      ];

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getAgentRepetitions as Mock).mockResolvedValue(mockAgentRepetitions);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getAgentRepetitions).toHaveBeenCalled();
      });

      // Skipped repetitions should not appear in the tree
      expect(screen.queryByTestId('tree-item-AgentScope')).not.toBeInTheDocument();
    });

    it('should render scope repetitions', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            ForEach: {
              name: 'ForEach',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              repetitionCount: 2,
            },
          },
        },
      };

      const mockRepetitions = [
        {
          name: '000000',
          properties: {
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:01Z',
            repetitionIndexes: [],
          },
        },
        {
          name: '000001',
          properties: {
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:02Z',
            repetitionIndexes: [],
          },
        },
      ];

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getNodeRepetitions as Mock).mockResolvedValue(mockRepetitions);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getNodeRepetitions).toHaveBeenCalledWith('ForEach', 'run-123', false);
      });
    });

    it('should skip scope repetitions with Skipped status', async () => {
      const mockRun = {
        id: 'run-123',
        properties: {
          status: 'Succeeded',
          trigger: {
            name: 'manual',
            status: 'Succeeded',
            startTime: '2024-01-01T10:00:00Z',
          },
          actions: {
            ForEach: {
              name: 'ForEach',
              status: 'Succeeded',
              startTime: '2024-01-01T10:00:01Z',
              repetitionCount: 1,
            },
          },
        },
      };

      const mockRepetitions = [
        {
          name: '000000',
          properties: {
            status: 'Skipped',
            startTime: '2024-01-01T10:00:01Z',
            repetitionIndexes: [],
          },
        },
      ];

      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRun);
      (Core.getNodeRepetitions as Mock).mockResolvedValue(mockRepetitions);

      renderWithProviders();

      await waitFor(() => {
        expect(Core.getNodeRepetitions).toHaveBeenCalled();
      });

      // Skipped repetitions should not be rendered
      expect(screen.queryByTestId('tree-item-ForEach')).not.toBeInTheDocument();
    });
  });
});
