/**
 * @vitest-environment jsdom
 *
 * Unit-test coverage for designer keyboard navigation.
 *
 * Background — why this replaces an E2E test:
 *   The previous ExTester scenario `keyboardNavigation.test.ts` (Phase 4.6,
 *   ADO #10273324) claimed to verify Ctrl+Up / Ctrl+Down navigation between
 *   designer canvas nodes. In practice it only logged whether focus moved —
 *   it never `assert`ed it — because in this codebase node-to-node arrow-key
 *   navigation is intentionally disabled at the React Flow layer:
 *     - `nodesFocusable={false}`
 *     - `edgesFocusable={false}`
 *     - `elementsSelectable={false}`
 *     - `disableKeyboardA11y={true}`
 *   (see `libs/designer/src/lib/ui/DesignerReactFlow.tsx`).
 *
 *   The *real* keyboard-navigation surface in `<Designer />` is the
 *   "go to operation / node search" hotkey wired up in
 *   `libs/designer/src/lib/ui/Designer.tsx` via `react-hotkeys-hook`:
 *     - Web (non-VS-Code):  Ctrl/Cmd + Shift + P  -> opens NodeSearch panel
 *     - VS Code host:       Ctrl/Cmd + Alt + P    -> opens NodeSearch panel
 *       (the web binding collides with VS Code's command palette, so the
 *        VS Code host swaps to Alt to avoid shadowing it).
 *
 *   These tests verify that contract at the React/Redux layer, which is
 *   where the logic actually lives — no VS Code shell, Functions runtime,
 *   or workspace fixtures required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// --- Capture useHotkeys registrations so we can invoke their callbacks ---

type HotkeyRegistration = {
  keys: string | string[];
  callback: (event: KeyboardEvent) => void;
  options?: { enabled?: boolean; preventDefault?: boolean };
};

const hotkeyRegistrations: HotkeyRegistration[] = [];

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (keys: string | string[], callback: (event: KeyboardEvent) => void, options?: HotkeyRegistration['options']) => {
    hotkeyRegistrations.push({ keys, callback, options });
  },
}));

// --- Mock state values ---

let mockIsVSCode = false;
let mockIsReadOnly = false;
let mockIsMonitoringView = false;
let mockWorkflowHasAgentLoop = false;
let mockIsA2AWorkflow = false;
let mockNodesInitialized = true;
let mockRecurrenceInterval: number | undefined;
let mockWorkflowKind: string | undefined = 'stateful';

const mockDispatch = vi.fn();
const openPanelMock = vi.fn((payload) => ({ type: 'panel/openPanel', payload }));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      workflow: { workflowKind: mockWorkflowKind },
      modal: { isKnowledgeConnectionOpen: false },
    }),
}));

vi.mock('../../core', () => ({
  openPanel: (...args: unknown[]) => openPanelMock(...args),
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

// --- Mock heavy UI children — we only care about the keyboard wiring. ---

vi.mock('../Controls', () => ({ default: () => <div data-testid="controls" /> }));
vi.mock('../Minimap', () => ({ default: () => <div data-testid="minimap" /> }));
vi.mock('../common/DeleteModal/DeleteModal', () => ({ default: () => null }));
vi.mock('../panel/panelRoot', () => ({ PanelRoot: () => <div data-testid="panel-root" /> }));
vi.mock('../DesignerReactFlow', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="designer-react-flow">{children}</div>,
}));
vi.mock('../common/PerformanceDebug/PerformanceDebug', () => ({ PerformanceDebugTool: () => null }));
vi.mock('../CanvasFinder', () => ({ CanvasFinder: () => null }));
vi.mock('../common/DesignerContextualMenu/DesignerContextualMenu', () => ({ DesignerContextualMenu: () => null }));
vi.mock('../common/EdgeContextualMenu/EdgeContextualMenu', () => ({ EdgeContextualMenu: () => null }));
vi.mock('../common/DragPanMonitor/DragPanMonitor', () => ({ DragPanMonitor: () => null }));
vi.mock('../CanvasSizeMonitor', () => ({ CanvasSizeMonitor: () => null }));
vi.mock('../panel/agentChat/agentChat', () => ({ AgentChat: () => null }));
vi.mock('../MonitoringTimeline', () => ({ default: () => null }));
vi.mock('../DesignerDialog', () => ({ DesignerDialog: () => null }));

vi.mock('@fluentui/react', () => ({
  css: (...args: string[]) => args.filter(Boolean).join(' '),
  setLayerHostSelector: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Background: () => null,
}));
vi.mock('react-dnd-multi-backend', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  createTransition: vi.fn(() => vi.fn()),
  MouseTransition: {},
}));
vi.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));
vi.mock('react-dnd-accessible-backend', () => ({
  default: {},
  isKeyboardDragTrigger: vi.fn(),
}));
vi.mock('@microsoft/designer-ui', () => ({
  PanelLocation: { Left: 'left', Right: 'right' },
}));

// Import AFTER all mocks
import { Designer } from '../Designer';

const NODE_SEARCH_PAYLOAD = { panelMode: 'NodeSearch' };

const findRegistration = (predicate: (keys: string | string[]) => boolean): HotkeyRegistration | undefined =>
  hotkeyRegistrations.find((r) => predicate(r.keys));

const containsExact = (key: string) => (keys: string | string[]) => (Array.isArray(keys) ? keys.includes(key) : keys === key);

describe('Designer — keyboard navigation hotkeys', () => {
  beforeEach(() => {
    hotkeyRegistrations.length = 0;
    mockIsVSCode = false;
    mockIsReadOnly = false;
    mockIsMonitoringView = false;
    mockWorkflowHasAgentLoop = false;
    mockIsA2AWorkflow = false;
    mockNodesInitialized = true;
    mockRecurrenceInterval = undefined;
    mockWorkflowKind = 'stateful';
    mockDispatch.mockClear();
    openPanelMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('registers both NodeSearch hotkey bindings (web + VS Code) every render', () => {
    render(<Designer />);

    // Two useHotkeys calls — one for Ctrl/Meta+Shift+P (web), one for Ctrl/Meta+Alt+P (VS Code).
    expect(hotkeyRegistrations).toHaveLength(2);

    const webBinding = findRegistration(containsExact('ctrl+shift+p'));
    const vscodeBinding = findRegistration(containsExact('ctrl+alt+p'));

    expect(webBinding).toBeDefined();
    expect(webBinding!.keys).toEqual(expect.arrayContaining(['meta+shift+p', 'ctrl+shift+p']));

    expect(vscodeBinding).toBeDefined();
    expect(vscodeBinding!.keys).toEqual(expect.arrayContaining(['meta+alt+p', 'ctrl+alt+p', 'meta+option+p', 'ctrl+option+p']));
  });

  it('enables the web binding and disables the VS Code binding when not running in VS Code', () => {
    mockIsVSCode = false;
    render(<Designer />);

    const webBinding = findRegistration(containsExact('ctrl+shift+p'));
    const vscodeBinding = findRegistration(containsExact('ctrl+alt+p'));

    // The web binding is enabled when NOT in VS Code (so it does not shadow
    // VS Code's own Ctrl+Shift+P command palette inside the VS Code host).
    expect(webBinding!.options?.enabled).toBe(true);
    expect(vscodeBinding!.options?.enabled).toBe(false);
  });

  it('enables the VS Code binding and disables the web binding when running in VS Code', () => {
    mockIsVSCode = true;
    render(<Designer />);

    const webBinding = findRegistration(containsExact('ctrl+shift+p'));
    const vscodeBinding = findRegistration(containsExact('ctrl+alt+p'));

    expect(webBinding!.options?.enabled).toBe(false);
    expect(vscodeBinding!.options?.enabled).toBe(true);
  });

  it('invoking the web NodeSearch hotkey dispatches openPanel({ panelMode: "NodeSearch" }) and preventDefaults the event', () => {
    mockIsVSCode = false;
    render(<Designer />);

    const webBinding = findRegistration(containsExact('ctrl+shift+p'))!;
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
    webBinding.callback(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(openPanelMock).toHaveBeenCalledWith(NODE_SEARCH_PAYLOAD);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/openPanel', payload: NODE_SEARCH_PAYLOAD });
  });

  it('invoking the VS Code NodeSearch hotkey dispatches openPanel({ panelMode: "NodeSearch" }) and preventDefaults the event', () => {
    mockIsVSCode = true;
    render(<Designer />);

    const vscodeBinding = findRegistration(containsExact('ctrl+alt+p'))!;
    const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
    vscodeBinding.callback(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(openPanelMock).toHaveBeenCalledWith(NODE_SEARCH_PAYLOAD);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/openPanel', payload: NODE_SEARCH_PAYLOAD });
  });
});
