// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockDispatch = vi.fn();
let mockCanUndo = false;
let mockCanRedo = false;
let mockIsReadOnly = false;
let mockIsMonitoringView = false;
let mockIsVSCode = false;

vi.mock('../../core', () => ({
  openPanel: vi.fn((arg: unknown) => ({ type: 'openPanel', payload: arg })),
  useNodesInitialized: () => true,
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
  useSelector: vi.fn(() => undefined),
}));

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
  Background: () => <div data-testid="background" />,
  ReactFlowProvider: ({ children }: any) => <div data-testid="reactflow-provider">{children}</div>,
}));

vi.mock('../Controls', () => ({ default: () => <div data-testid="controls" /> }));
vi.mock('../Minimap', () => ({ default: () => <div data-testid="minimap" /> }));
vi.mock('../common/DeleteModal/DeleteModal', () => ({ default: () => null }));
vi.mock('../panel/panelRoot', () => ({ PanelRoot: () => null }));
vi.mock('../common/PerformanceDebug/PerformanceDebug', () => ({ PerformanceDebugTool: () => null }));
vi.mock('../CanvasFinder', () => ({ CanvasFinder: () => null }));
vi.mock('../common/DesignerContextualMenu/DesignerContextualMenu', () => ({ DesignerContextualMenu: () => null }));
vi.mock('../common/EdgeContextualMenu/EdgeContextualMenu', () => ({ EdgeContextualMenu: () => null }));
vi.mock('../common/DragPanMonitor/DragPanMonitor', () => ({ DragPanMonitor: () => null }));
vi.mock('../CanvasSizeMonitor', () => ({ CanvasSizeMonitor: () => null }));
vi.mock('../DesignerReactFlow', () => ({ default: ({ children }: any) => <div data-testid="designer-reactflow">{children}</div> }));
vi.mock('../panel', () => ({ RunHistoryPanel: () => null }));
vi.mock('../Designer.styles', () => ({
  useDesignerStyles: () => ({ vars: '', darkVars: '', lightVars: '', layerHost: '' }),
}));
vi.mock('../RunDisplay', () => ({ RunDisplay: () => null }));
vi.mock('../common/KindChangeDialog/KindChangeDialog', () => ({ KindChangeDialog: () => null }));

import { Designer } from '../Designer';
import { onUndoClick, onRedoClick } from '../../core';

describe('Designer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hotkeysRegistrations.length = 0;
    mockCanUndo = false;
    mockCanRedo = false;
    mockIsReadOnly = false;
    mockIsMonitoringView = false;
    mockIsVSCode = false;
  });

  it('should render the designer canvas', () => {
    render(<Designer />);
    expect(screen.getByTestId('dnd-provider')).toBeDefined();
    expect(screen.getByTestId('reactflow-provider')).toBeDefined();
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
});
