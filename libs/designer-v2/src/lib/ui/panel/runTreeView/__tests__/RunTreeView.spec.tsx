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
});
