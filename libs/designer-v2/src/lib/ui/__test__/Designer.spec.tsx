// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mockDispatch = vi.fn();
let mockCanUndo = false;
let mockCanRedo = false;
let mockIsReadOnly = false;
let mockIsMonitoringView = false;
let mockIsVSCode = false;
let mockWorkflowKind: string | undefined;
let mockExtractionOpen = false;
let mockHasUnsupportedMultipleTriggers = false;
let mockRunInstance: { id: string; name: string } | null = null;
let mockSelectedNodeId: string | undefined;
let mockSelectedNodeIds: string[] = [];
let mockAllSelectableNodeIds: string[] = [];
let mockNodesInitialized = true;

const mockOpenRun = vi.fn();
const mockOpenRunDetails = vi.fn();

vi.mock('../../core', () => ({
  openPanel: vi.fn((arg: unknown) => ({ type: 'openPanel', payload: arg })),
  useNodesInitialized: () => mockNodesInitialized,
  onUndoClick: vi.fn(() => ({ type: 'onUndoClick' })),
  onRedoClick: vi.fn(() => ({ type: 'onRedoClick' })),
  useCanUndo: () => mockCanUndo,
  useCanRedo: () => mockCanRedo,
}));

vi.mock('../../core/queries/browse', () => ({
  usePreloadOperationsQuery: vi.fn(),
  usePreloadConnectorsQuery: vi.fn(),
}));

vi.mock('../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockIsMonitoringView,
  useReadOnly: () => mockIsReadOnly,
  useHostOptions: () => ({}),
  useIsVSCode: () => mockIsVSCode,
  useIsDarkMode: () => false,
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  // Most selectors in this test are mocked directly via their hook exports and never reach real
  // `useSelector` logic, so the fallback behavior (returning undefined) is preserved for them.
  // The one exception is Designer.tsx's inline `useSelector((state) => state.workflow.workflowKind)`,
  // which we special-case here since it isn't backed by a named/mockable selector hook.
  useSelector: vi.fn((selector: (state: any) => unknown) => {
    try {
      return selector({
        workflow: { workflowKind: mockWorkflowKind },
        designerView: { workflowExtractionDialogOpen: mockExtractionOpen },
        modal: { isKnowledgeConnectionOpen: false },
      });
    } catch {
      return undefined;
    }
  }),
}));

vi.mock('../../core/state/panel/panelSelectors', () => ({
  useOperationPanelSelectedNodeId: () => mockSelectedNodeId,
  useOperationPanelSelectedNodeIds: () => mockSelectedNodeIds,
}));

vi.mock('../../core/state/panel/panelSlice', () => ({
  setNodeSelection: vi.fn((payload: string[]) => ({ type: 'setNodeSelection', payload })),
}));

vi.mock('../../core/state/designerView/designerViewSlice', () => ({
  setShowDeleteModalNodeId: vi.fn((payload: string) => ({ type: 'setShowDeleteModalNodeId', payload })),
  setShowMultiSelectDeleteModal: vi.fn((payload: boolean) => ({ type: 'setShowMultiSelectDeleteModal', payload })),
}));

vi.mock('../../core/actions/bjsworkflow/copypaste', () => ({
  copyOperation: vi.fn((payload: unknown) => ({ type: 'copyOperation', payload })),
  copyOperations: vi.fn((payload: unknown) => ({ type: 'copyOperations', payload })),
  cutOperations: vi.fn((payload: unknown) => ({ type: 'cutOperations', payload })),
  duplicateOperations: vi.fn((payload: unknown) => ({ type: 'duplicateOperations', payload })),
}));

vi.mock('../../core/state/workflow/workflowSelectors', () => ({
  useAllSelectableNodeIds: () => mockAllSelectableNodeIds,
  useRunInstance: () => mockRunInstance,
}));

vi.mock('../../core/BJSWorkflowProvider', () => ({
  useIsUnsupportedMultipleTriggers: () => mockHasUnsupportedMultipleTriggers,
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    HostService: () => ({ openRun: mockOpenRun, openRunDetails: mockOpenRunDetails }),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@fluentui/react', () => ({
  css: (...args: string[]) => args.filter(Boolean).join(' '),
  setLayerHostSelector: vi.fn(),
}));

vi.mock('@microsoft/designer-ui', () => ({
  mergeClasses: (...args: string[]) => args.filter(Boolean).join(' '),
  PanelLocation: { Right: 'right', Left: 'left' },
  MultiTriggerUnsupportedMessage: ({ isStandard, onRunDetailsClick }: { isStandard: boolean; onRunDetailsClick?: () => void }) => (
    <div data-testid="multi-trigger-unsupported-message" data-is-standard={isStandard ? 'true' : 'false'}>
      {onRunDetailsClick ? (
        <button type="button" data-testid="run-details-button" onClick={onRunDetailsClick}>
          Run details
        </button>
      ) : null}
    </div>
  ),
}));

// Mock react-hotkeys-hook to capture registrations
const hotkeysRegistrations: Array<{ keys: string[]; callback: (e: KeyboardEvent) => void; options: Record<string, unknown> }> = [];
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (keys: string[], callback: (e: KeyboardEvent) => void, options: Record<string, unknown>) => {
    hotkeysRegistrations.push({ keys, callback, options });
    return { current: null };
  },
}));

vi.mock('react-dnd-accessible-backend', () => ({
  default: vi.fn(),
  isKeyboardDragTrigger: vi.fn(() => false),
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: vi.fn(),
}));

vi.mock('react-dnd-multi-backend', () => ({
  DndProvider: ({ children }: any) => <div data-testid="dnd-provider">{children}</div>,
  createTransition: vi.fn(() => vi.fn()),
  MouseTransition: vi.fn(),
}));

vi.mock('@xyflow/react', () => ({
  Background: (props: Record<string, unknown>) => (
    <div
      data-testid="background"
      data-bg-color={props.bgColor as string | undefined}
      data-color={props.color as string | undefined}
      data-size={props.size as number | undefined}
    />
  ),
  ReactFlowProvider: ({ children }: any) => <div data-testid="reactflow-provider">{children}</div>,
}));

vi.mock('../Controls', () => ({ default: () => <div data-testid="controls" /> }));
vi.mock('../Minimap', () => ({ default: () => <div data-testid="minimap" /> }));
vi.mock('../common/DeleteModal/DeleteModal', () => ({ default: () => null }));
vi.mock('../common/DeleteModal/MultiSelectDeleteModal', () => ({ MultiSelectDeleteModal: () => null }));
vi.mock('../panel/panelRoot', () => ({ PanelRoot: () => <div data-testid="panel-root" /> }));
vi.mock('../common/PerformanceDebug/PerformanceDebug', () => ({ PerformanceDebugTool: () => null }));
vi.mock('../CanvasFinder', () => ({ CanvasFinder: () => <div data-testid="canvas-finder" /> }));
vi.mock('../common/DesignerContextualMenu/DesignerContextualMenu', () => ({ DesignerContextualMenu: () => null }));
vi.mock('../common/EdgeContextualMenu/EdgeContextualMenu', () => ({ EdgeContextualMenu: () => null }));
vi.mock('../common/DragPanMonitor/DragPanMonitor', () => ({ DragPanMonitor: () => null }));
vi.mock('../CanvasSizeMonitor', () => ({ CanvasSizeMonitor: () => null }));
vi.mock('../panel/multiSelectPanel/workflowExtraction', () => ({
  WorkflowExtractionDialog: () => <div data-testid="workflow-extraction-dialog" />,
}));
vi.mock('../DesignerReactFlow', () => ({ default: ({ children }: any) => <div data-testid="designer-reactflow">{children}</div> }));
vi.mock('../panel', () => ({ RunHistoryPanel: () => <div data-testid="run-history-panel" /> }));
vi.mock('../Designer.styles', () => ({
  useDesignerStyles: () => ({ vars: '', darkVars: '', lightVars: '', layerHost: '' }),
}));
vi.mock('../RunDisplay', () => ({ RunDisplay: () => null }));
vi.mock('../common/KindChangeDialog/KindChangeDialog', () => ({ KindChangeDialog: () => null }));

import { Designer } from '../Designer';
import { onUndoClick, onRedoClick, openPanel } from '../../core';
import { usePreloadConnectorsQuery, usePreloadOperationsQuery } from '../../core/queries/browse';
import { setNodeSelection } from '../../core/state/panel/panelSlice';
import { setShowDeleteModalNodeId, setShowMultiSelectDeleteModal } from '../../core/state/designerView/designerViewSlice';
import { copyOperation, copyOperations, cutOperations, duplicateOperations } from '../../core/actions/bjsworkflow/copypaste';

const getHotkeyRegistration = (key: string) =>
  hotkeysRegistrations.find((registration) => registration.keys.some((registeredKey) => registeredKey === key));

const invokeHotkey = (key: string) => {
  const registration = getHotkeyRegistration(key);
  const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
  registration?.callback(event);
  return event;
};

describe('Designer', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    hotkeysRegistrations.length = 0;
    mockCanUndo = false;
    mockCanRedo = false;
    mockIsReadOnly = false;
    mockIsMonitoringView = false;
    mockIsVSCode = false;
    mockWorkflowKind = undefined;
    mockExtractionOpen = false;
    mockHasUnsupportedMultipleTriggers = false;
    mockRunInstance = null;
    mockSelectedNodeId = undefined;
    mockSelectedNodeIds = [];
    mockAllSelectableNodeIds = [];
    mockNodesInitialized = true;
  });

  it('should render the designer canvas', () => {
    render(<Designer />);
    expect(screen.getByTestId('dnd-provider')).toBeDefined();
    expect(screen.getByTestId('reactflow-provider')).toBeDefined();
    expect(screen.getByTestId('designer-reactflow')).toBeDefined();
    expect(screen.getByTestId('run-history-panel')).toBeDefined();
    expect(screen.getByTestId('panel-root')).toBeDefined();
  });

  it('should register undo hotkeys (meta+z, ctrl+z)', () => {
    render(<Designer />);
    const undoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+z' || key === 'ctrl+z')
    );
    expect(undoRegistration).toBeDefined();
  });

  it('should register redo hotkeys (meta+y, ctrl+y, meta+shift+z, ctrl+shift+z)', () => {
    render(<Designer />);
    const redoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+y' || key === 'ctrl+y')
    );
    expect(redoRegistration).toBeDefined();
  });

  it('should enable undo hotkey when canUndo is true and not readOnly', () => {
    mockCanUndo = true;
    mockIsReadOnly = false;
    render(<Designer />);
    const undoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+z' || key === 'ctrl+z')
    );
    expect(undoRegistration?.options.enabled).toBe(true);
  });

  it('should disable undo hotkey when canUndo is false', () => {
    mockCanUndo = false;
    mockIsReadOnly = false;
    render(<Designer />);
    const undoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+z' || key === 'ctrl+z')
    );
    expect(undoRegistration?.options.enabled).toBe(false);
  });

  it('should disable undo hotkey when readOnly is true', () => {
    mockCanUndo = true;
    mockIsReadOnly = true;
    render(<Designer />);
    const undoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+z' || key === 'ctrl+z')
    );
    expect(undoRegistration?.options.enabled).toBe(false);
  });

  it('should enable redo hotkey when canRedo is true and not readOnly', () => {
    mockCanRedo = true;
    mockIsReadOnly = false;
    render(<Designer />);
    const redoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+y' || key === 'ctrl+y')
    );
    expect(redoRegistration?.options.enabled).toBe(true);
  });

  it('should disable redo hotkey when canRedo is false', () => {
    mockCanRedo = false;
    render(<Designer />);
    const redoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+y' || key === 'ctrl+y')
    );
    expect(redoRegistration?.options.enabled).toBe(false);
  });

  it('should dispatch onUndoClick when undo hotkey callback is invoked', () => {
    mockCanUndo = true;
    render(<Designer />);
    const undoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+z' || key === 'ctrl+z')
    );
    const fakeEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
    undoRegistration?.callback(fakeEvent);
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(onUndoClick).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should dispatch onRedoClick when redo hotkey callback is invoked', () => {
    mockCanRedo = true;
    render(<Designer />);
    const redoRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'meta+y' || key === 'ctrl+y')
    );
    const fakeEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
    redoRegistration?.callback(fakeEvent);
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(onRedoClick).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should register node search hotkey for non-VSCode (ctrl+shift+p)', () => {
    mockIsVSCode = false;
    render(<Designer />);
    const searchRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'ctrl+shift+p' || key === 'meta+shift+p')
    );
    expect(searchRegistration).toBeDefined();
    expect(searchRegistration?.options.enabled).toBe(true);
  });

  it('should register node search hotkey for VSCode (ctrl+alt+p)', () => {
    mockIsVSCode = true;
    render(<Designer />);
    const searchRegistration = hotkeysRegistrations.find((registration) =>
      registration.keys.some((key) => key === 'ctrl+alt+p' || key === 'meta+alt+p')
    );
    expect(searchRegistration).toBeDefined();
    expect(searchRegistration?.options.enabled).toBe(true);
  });

  it('dispatches node search from the enabled host-specific hotkey', () => {
    mockIsVSCode = true;
    render(<Designer />);

    const event = invokeHotkey('ctrl+alt+p');

    expect(event.preventDefault).toHaveBeenCalled();
    expect(openPanel).toHaveBeenCalledWith({ panelMode: 'NodeSearch' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'openPanel', payload: { panelMode: 'NodeSearch' } });
    expect(getHotkeyRegistration('ctrl+shift+p')?.options.enabled).toBe(false);
  });

  it('treats an open extraction dialog as read-only and disables search shortcuts', () => {
    mockExtractionOpen = true;
    mockCanUndo = true;
    mockCanRedo = true;
    render(<Designer />);

    expect(getHotkeyRegistration('ctrl+shift+p')?.options.enabled).toBe(false);
    expect(getHotkeyRegistration('ctrl+alt+p')?.options.enabled).toBe(false);
    expect(getHotkeyRegistration('ctrl+z')?.options.enabled).toBe(false);
    expect(getHotkeyRegistration('ctrl+y')?.options.enabled).toBe(false);
    expect(getHotkeyRegistration('delete')?.options.enabled).toBe(false);
    expect(screen.getByTestId('background').getAttribute('data-bg-color')).toBe('#80808010');
    expect(screen.getByTestId('workflow-extraction-dialog')).toBeDefined();
  });

  it('preloads search only after nodes initialize in editable design mode', () => {
    const { rerender } = render(<Designer />);
    expect(usePreloadOperationsQuery).toHaveBeenCalledTimes(1);
    expect(usePreloadConnectorsQuery).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    mockNodesInitialized = false;
    rerender(<Designer />);
    expect(usePreloadOperationsQuery).not.toHaveBeenCalled();
    expect(usePreloadConnectorsQuery).not.toHaveBeenCalled();
  });

  it('passes custom background properties through to React Flow', () => {
    render(<Designer backgroundProps={{ color: '#123456', size: 4 }} />);

    expect(screen.getByTestId('background').getAttribute('data-color')).toBe('#123456');
    expect(screen.getByTestId('background').getAttribute('data-size')).toBe('4');
  });

  describe('selection hotkeys', () => {
    it('opens the multi-select delete confirmation when multiple nodes are selected', () => {
      mockSelectedNodeIds = ['first', 'second'];
      render(<Designer />);

      const event = invokeHotkey('delete');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(setShowMultiSelectDeleteModal).toHaveBeenCalledWith(true);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setShowMultiSelectDeleteModal', payload: true });
      expect(setShowDeleteModalNodeId).not.toHaveBeenCalled();
    });

    it('opens the single-node delete confirmation for the selected node', () => {
      mockSelectedNodeId = 'only-node';
      render(<Designer />);

      const event = invokeHotkey('backspace');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(setShowDeleteModalNodeId).toHaveBeenCalledWith('only-node');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setShowDeleteModalNodeId', payload: 'only-node' });
    });

    it('duplicates all selected nodes and falls back to the single selected node', () => {
      mockSelectedNodeIds = ['first', 'second'];
      const { unmount } = render(<Designer />);
      invokeHotkey('ctrl+d');
      expect(duplicateOperations).toHaveBeenCalledWith({ nodeIds: ['first', 'second'] });

      unmount();
      hotkeysRegistrations.length = 0;
      mockSelectedNodeIds = [];
      mockSelectedNodeId = 'only-node';
      render(<Designer />);
      invokeHotkey('ctrl+d');
      expect(duplicateOperations).toHaveBeenLastCalledWith({ nodeIds: ['only-node'] });
    });

    it('copies multiple nodes or a single node with the matching action', () => {
      mockSelectedNodeIds = ['first', 'second'];
      const { unmount } = render(<Designer />);
      invokeHotkey('ctrl+c');
      expect(copyOperations).toHaveBeenCalledWith({ nodeIds: ['first', 'second'] });

      unmount();
      hotkeysRegistrations.length = 0;
      mockSelectedNodeIds = [];
      mockSelectedNodeId = 'only-node';
      render(<Designer />);
      invokeHotkey('ctrl+c');
      expect(copyOperation).toHaveBeenCalledWith({ nodeId: 'only-node' });
    });

    it('cuts the current multi-selection or single selection', () => {
      mockSelectedNodeIds = ['first', 'second'];
      const { unmount } = render(<Designer />);
      invokeHotkey('ctrl+x');
      expect(cutOperations).toHaveBeenCalledWith({ nodeIds: ['first', 'second'] });

      unmount();
      hotkeysRegistrations.length = 0;
      mockSelectedNodeIds = [];
      mockSelectedNodeId = 'only-node';
      render(<Designer />);
      invokeHotkey('ctrl+x');
      expect(cutOperations).toHaveBeenLastCalledWith({ nodeIds: ['only-node'] });
    });

    it('selects every selectable canvas node', () => {
      mockAllSelectableNodeIds = ['first', 'second', 'third'];
      render(<Designer />);

      const event = invokeHotkey('ctrl+a');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(setNodeSelection).toHaveBeenCalledWith(['first', 'second', 'third']);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'setNodeSelection',
        payload: ['first', 'second', 'third'],
      });
    });
  });

  describe('multiple triggers unsupported', () => {
    it('should render the normal designer canvas (not the unsupported message) when there is not a multiple-trigger workflow', () => {
      mockHasUnsupportedMultipleTriggers = false;
      render(<Designer />);
      expect(screen.getByTestId('dnd-provider')).toBeDefined();
      expect(screen.getByTestId('designer-reactflow')).toBeDefined();
      expect(screen.queryByTestId('multi-trigger-unsupported-message')).toBeNull();
    });

    it('should skip only the canvas/graph region (not the surrounding shell) and render the unsupported message in its place', () => {
      mockHasUnsupportedMultipleTriggers = true;
      render(<Designer />);
      // The canvas/graph region (which would otherwise trigger graph initialization) is replaced...
      expect(screen.queryByTestId('designer-reactflow')).toBeNull();
      expect(screen.getByTestId('multi-trigger-unsupported-message')).toBeDefined();
      // ...but the rest of the designer shell -- drag/drop root, react flow context, run-history
      // panel, side panels, and other host-facing controls -- still renders normally.
      expect(screen.getByTestId('dnd-provider')).toBeDefined();
      expect(screen.getByTestId('reactflow-provider')).toBeDefined();
      expect(screen.getByTestId('run-history-panel')).toBeDefined();
      expect(screen.getByTestId('panel-root')).toBeDefined();
      expect(screen.getByTestId('canvas-finder')).toBeDefined();
    });

    it('should not show a Run details button for Consumption in design/edit mode', () => {
      mockHasUnsupportedMultipleTriggers = true;
      mockWorkflowKind = undefined; // Consumption
      mockIsMonitoringView = false;
      mockRunInstance = { id: '/subscriptions/x/runs/run1', name: 'run1' };
      render(<Designer />);
      const message = screen.getByTestId('multi-trigger-unsupported-message');
      expect(message.getAttribute('data-is-standard')).toBe('false');
      expect(screen.queryByTestId('run-details-button')).toBeNull();
    });

    it('should show a Run details button for Consumption in monitoring/run-history mode and invoke only HostService().openRunDetails', () => {
      mockHasUnsupportedMultipleTriggers = true;
      mockWorkflowKind = undefined; // Consumption
      mockIsMonitoringView = true;
      mockRunInstance = { id: '/subscriptions/x/runs/run1', name: 'run1' };
      render(<Designer />);
      const message = screen.getByTestId('multi-trigger-unsupported-message');
      expect(message.getAttribute('data-is-standard')).toBe('false');
      const button = screen.getByTestId('run-details-button');
      button.click();
      expect(mockOpenRunDetails).toHaveBeenCalledWith('/subscriptions/x/runs/run1');
      expect(mockOpenRun).not.toHaveBeenCalled();
    });

    it('should not show a Run details button for Standard in design/edit mode', () => {
      mockHasUnsupportedMultipleTriggers = true;
      mockWorkflowKind = 'stateful'; // Standard
      mockIsMonitoringView = false;
      render(<Designer />);
      const message = screen.getByTestId('multi-trigger-unsupported-message');
      expect(message.getAttribute('data-is-standard')).toBe('true');
      expect(screen.queryByTestId('run-details-button')).toBeNull();
    });

    it('should not show a Run details button for Standard in monitoring mode either', () => {
      mockHasUnsupportedMultipleTriggers = true;
      mockWorkflowKind = 'stateless'; // Standard
      mockIsMonitoringView = true;
      mockRunInstance = { id: '/subscriptions/x/runs/run1', name: 'run1' };
      render(<Designer />);
      const message = screen.getByTestId('multi-trigger-unsupported-message');
      expect(message.getAttribute('data-is-standard')).toBe('true');
      expect(screen.queryByTestId('run-details-button')).toBeNull();
    });
  });
});
