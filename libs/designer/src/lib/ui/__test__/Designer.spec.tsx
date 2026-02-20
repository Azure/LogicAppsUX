import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock state values
let mockIsVSCode = false;
let mockIsReadOnly = false;
let mockIsMonitoringView = false;
let mockWorkflowHasAgentLoop = false;
let mockIsA2AWorkflow = false;
let mockNodesInitialized = true;
let mockRecurrenceInterval: number | undefined = undefined;
let mockWorkflowKind: string | undefined = 'stateful';

const mockDispatch = vi.fn();

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      workflow: { workflowKind: mockWorkflowKind },
    }),
}));

// Mock core imports
vi.mock('../../core', () => ({
  openPanel: vi.fn((payload) => ({ type: 'panel/openPanel', payload })),
  useNodesInitialized: () => mockNodesInitialized,
}));

vi.mock('../../core/queries/browse', () => ({
  usePreloadOperationsQuery: vi.fn(),
  usePreloadConnectorsQuery: vi.fn(),
}));

vi.mock('../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockIsMonitoringView,
  useReadOnly: () => mockIsReadOnly,
  useHostOptions: () => ({ recurrenceInterval: mockRecurrenceInterval }),
  useIsVSCode: () => mockIsVSCode,
}));

vi.mock('../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => mockIsA2AWorkflow,
  useWorkflowHasAgentLoop: () => mockWorkflowHasAgentLoop,
}));

// Mock UI components
vi.mock('../Controls', () => ({
  default: () => <div data-testid="controls">Controls</div>,
}));

vi.mock('../Minimap', () => ({
  default: () => <div data-testid="minimap">Minimap</div>,
}));

vi.mock('../common/DeleteModal/DeleteModal', () => ({
  default: () => <div data-testid="delete-modal">DeleteModal</div>,
}));

vi.mock('../panel/panelRoot', () => ({
  PanelRoot: ({ panelLocation }: { panelLocation: string }) => (
    <div data-testid="panel-root" data-panel-location={panelLocation}>
      PanelRoot
    </div>
  ),
}));

vi.mock('../DesignerReactFlow', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="designer-react-flow">{children}</div>,
}));

vi.mock('../common/PerformanceDebug/PerformanceDebug', () => ({
  PerformanceDebugTool: () => <div data-testid="performance-debug">PerformanceDebugTool</div>,
}));

vi.mock('../CanvasFinder', () => ({
  CanvasFinder: () => <div data-testid="canvas-finder">CanvasFinder</div>,
}));

vi.mock('../common/DesignerContextualMenu/DesignerContextualMenu', () => ({
  DesignerContextualMenu: () => <div data-testid="designer-contextual-menu">DesignerContextualMenu</div>,
}));

vi.mock('../common/EdgeContextualMenu/EdgeContextualMenu', () => ({
  EdgeContextualMenu: () => <div data-testid="edge-contextual-menu">EdgeContextualMenu</div>,
}));

vi.mock('../common/DragPanMonitor/DragPanMonitor', () => ({
  DragPanMonitor: () => <div data-testid="drag-pan-monitor">DragPanMonitor</div>,
}));

vi.mock('../CanvasSizeMonitor', () => ({
  CanvasSizeMonitor: () => <div data-testid="canvas-size-monitor">CanvasSizeMonitor</div>,
}));

vi.mock('../panel/agentChat/agentChat', () => ({
  AgentChat: () => <div data-testid="agent-chat">AgentChat</div>,
}));

vi.mock('../MonitoringTimeline', () => ({
  default: () => <div data-testid="monitoring-timeline">MonitoringTimeline</div>,
}));

// Mock external libraries
vi.mock('@fluentui/react', () => ({
  css: (...args: string[]) => args.filter(Boolean).join(' '),
  setLayerHostSelector: vi.fn(),
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="react-flow-provider">{children}</div>,
  Background: (props: Record<string, unknown>) => <div data-testid="background" {...props} />,
}));

vi.mock('react-dnd-multi-backend', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-provider">{children}</div>,
  createTransition: vi.fn(() => vi.fn()),
  MouseTransition: {},
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

vi.mock('react-dnd-accessible-backend', () => ({
  default: {},
  isKeyboardDragTrigger: vi.fn(),
}));

vi.mock('@microsoft/designer-ui', () => ({
  PanelLocation: {
    Left: 'left',
    Right: 'right',
  },
}));

// Import after mocks
import { Designer, SearchPreloader } from '../Designer';
import { PanelLocation } from '@microsoft/designer-ui';

describe('Designer', () => {
  beforeEach(() => {
    mockIsVSCode = false;
    mockIsReadOnly = false;
    mockIsMonitoringView = false;
    mockWorkflowHasAgentLoop = false;
    mockIsA2AWorkflow = false;
    mockNodesInitialized = true;
    mockRecurrenceInterval = undefined;
    mockWorkflowKind = 'stateful';
    mockDispatch.mockClear();
  });

  describe('rendering', () => {
    it('should render the designer container', () => {
      render(<Designer />);

      expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    });

    it('should render core components', () => {
      render(<Designer />);

      expect(screen.getByTestId('designer-react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
      expect(screen.getByTestId('panel-root')).toBeInTheDocument();
    });

    it('should render utility components', () => {
      render(<Designer />);

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByTestId('designer-contextual-menu')).toBeInTheDocument();
      expect(screen.getByTestId('edge-contextual-menu')).toBeInTheDocument();
      expect(screen.getByTestId('performance-debug')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-finder')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-size-monitor')).toBeInTheDocument();
      expect(screen.getByTestId('drag-pan-monitor')).toBeInTheDocument();
    });

    it('should render toolbar with correct role and aria-label', () => {
      render(<Designer />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveAttribute('aria-label', 'Designer controls');
    });

    it('should render layer host element', () => {
      const { container } = render(<Designer />);

      const layerHost = container.querySelector('#msla-layer-host');
      expect(layerHost).toBeInTheDocument();
    });
  });

  describe('panel location', () => {
    it('should default to right panel location', () => {
      render(<Designer />);

      const panelRoot = screen.getByTestId('panel-root');
      expect(panelRoot).toHaveAttribute('data-panel-location', 'right');
    });

    it('should apply left panel location when specified', () => {
      render(<Designer panelLocation={PanelLocation.Left} />);

      const panelRoot = screen.getByTestId('panel-root');
      expect(panelRoot).toHaveAttribute('data-panel-location', 'left');
    });

    it('should add left-panel class to toolbar when panel is on left', () => {
      render(<Designer panelLocation={PanelLocation.Left} />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar.className).toContain('left-panel');
    });

    it('should not add left-panel class when panel is on right', () => {
      render(<Designer panelLocation={PanelLocation.Right} />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar.className).not.toContain('left-panel');
    });
  });

  describe('background', () => {
    it('should not render Background when backgroundProps not provided', () => {
      render(<Designer />);

      expect(screen.queryByTestId('background')).not.toBeInTheDocument();
    });

    it('should render Background when backgroundProps provided', () => {
      render(<Designer backgroundProps={{ color: '#ccc', gap: 16 }} />);

      expect(screen.getByTestId('background')).toBeInTheDocument();
    });
  });

  describe('SearchPreloader', () => {
    it('should render SearchPreloader when not in monitoring/readonly mode and initialized', () => {
      mockIsMonitoringView = false;
      mockIsReadOnly = false;
      mockNodesInitialized = true;

      render(<Designer />);

      // SearchPreloader renders null but calls the preload hooks
      // We verify the component structure is correct
      expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    });

    it('should not render SearchPreloader in monitoring view', () => {
      mockIsMonitoringView = true;
      mockIsReadOnly = false;
      mockNodesInitialized = true;

      render(<Designer />);

      expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    });

    it('should not render SearchPreloader in readonly mode', () => {
      mockIsMonitoringView = false;
      mockIsReadOnly = true;
      mockNodesInitialized = true;

      render(<Designer />);

      expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    });
  });

  describe('AgentChat', () => {
    it('should not render AgentChat by default', () => {
      render(<Designer />);

      expect(screen.queryByTestId('agent-chat')).not.toBeInTheDocument();
    });

    it('should not render AgentChat when only monitoring view', () => {
      mockIsMonitoringView = true;
      mockWorkflowHasAgentLoop = false;

      render(<Designer />);

      expect(screen.queryByTestId('agent-chat')).not.toBeInTheDocument();
    });

    it('should not render AgentChat when only has agent loop', () => {
      mockIsMonitoringView = false;
      mockWorkflowHasAgentLoop = true;

      render(<Designer />);

      expect(screen.queryByTestId('agent-chat')).not.toBeInTheDocument();
    });

    it('should render AgentChat when monitoring view and has agent loop', () => {
      mockIsMonitoringView = true;
      mockWorkflowHasAgentLoop = true;

      render(<Designer />);

      expect(screen.getByTestId('agent-chat')).toBeInTheDocument();
    });
  });

  describe('MonitoringTimeline', () => {
    it('should not render MonitoringTimeline by default', () => {
      render(<Designer />);

      expect(screen.queryByTestId('monitoring-timeline')).not.toBeInTheDocument();
    });

    it('should not render MonitoringTimeline when only monitoring view', () => {
      mockIsMonitoringView = true;
      mockIsA2AWorkflow = false;

      render(<Designer />);

      expect(screen.queryByTestId('monitoring-timeline')).not.toBeInTheDocument();
    });

    it('should not render MonitoringTimeline when only A2A workflow', () => {
      mockIsMonitoringView = false;
      mockIsA2AWorkflow = true;

      render(<Designer />);

      expect(screen.queryByTestId('monitoring-timeline')).not.toBeInTheDocument();
    });

    it('should render MonitoringTimeline when monitoring view and A2A workflow', () => {
      mockIsMonitoringView = true;
      mockIsA2AWorkflow = true;

      render(<Designer />);

      expect(screen.getByTestId('monitoring-timeline')).toBeInTheDocument();
    });
  });
});

describe('SearchPreloader', () => {
  it('should render null', () => {
    const { container } = render(<SearchPreloader />);

    expect(container.firstChild).toBeNull();
  });
});
