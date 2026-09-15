import { configureStore, createAction, type PayloadActionCreator, type Reducer, type UnknownAction } from '@reduxjs/toolkit';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider, useReactFlow, type Node, type ReactFlowInstance } from '@xyflow/react';
import { createRef, type ComponentType, type RefObject } from 'react';
import { Provider, useSelector } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelContent } from '../../../../../designer-ui/src/lib/panel/panelcontent';

interface NavigationPanelState {
  isCollapsed: boolean;
  operationContent: {
    selectedNodeId?: string;
    selectedNodeIds?: string[];
    selectedNodeActiveTabId?: string;
    alternateSelectedNode?: { nodeId?: string; activeTabId?: string; persistence?: 'selected' | 'pinned' };
  };
  connectionContent: { selectedNodeIds: string[] };
}

interface NavigationContract<PanelState extends NavigationPanelState> {
  Navigation: ComponentType<{ canvasRef: RefObject<HTMLElement>; onNavigate: () => void }>;
  panelReducer: Reducer<PanelState>;
  changePanelNode: PayloadActionCreator<string>;
  setSelectedNodeId: PayloadActionCreator<string>;
  setFocusNode: PayloadActionCreator<string>;
  setSelectedPanelActiveTab: PayloadActionCreator<string | undefined>;
  setPinnedPanelActiveTab: PayloadActionCreator<string | undefined>;
  setAlternateSelectedNode: PayloadActionCreator<{
    nodeId: string;
    updatePanelOpenState?: boolean;
    panelPersistence?: 'selected' | 'pinned';
  }>;
  setNodeSelection?: PayloadActionCreator<string[]>;
}

interface NavigationOptions {
  suppressDefaultNodeSelectFunctionality: boolean;
  nodeSelectAdditionalCallback?: (id: string) => void;
  readOnly: boolean;
  isMonitoringView: boolean;
}

const updateHostOptions = createAction<Partial<NavigationOptions>>('test/updateHostOptions');

const operation = (id: string, nodeIndex: number, overrides: Partial<Node> = {}): Node => ({
  id,
  data: { nodeIndex },
  type: 'OPERATION_NODE',
  position: { x: 0, y: 0 },
  ...overrides,
});

export const nodeNavigationTestSuite = <PanelState extends NavigationPanelState>({
  Navigation,
  panelReducer,
  changePanelNode,
  setSelectedNodeId,
  setFocusNode,
  setSelectedPanelActiveTab,
  setPinnedPanelActiveTab,
  setAlternateSelectedNode,
  setNodeSelection,
}: NavigationContract<PanelState>) => {
  const setup = ({
    selectedId = 'First',
    suppress = false,
    callback,
    readOnly = false,
    isMonitoringView = false,
    includePanel = false,
    nodes = [
      operation('Last', 80, { position: { x: 10000, y: 10000 } }),
      operation('Scope-#scope', 20, { type: 'SCOPE_CARD_NODE' }),
      operation('First', 1),
    ],
  }: {
    selectedId?: string | null;
    suppress?: boolean;
    callback?: (id: string) => void;
    readOnly?: boolean;
    isMonitoringView?: boolean;
    includePanel?: boolean;
    nodes?: Node[];
  } = {}) => {
    const initialOptions: NavigationOptions = {
      suppressDefaultNodeSelectFunctionality: suppress,
      nodeSelectAdditionalCallback: callback,
      readOnly,
      isMonitoringView,
    };
    const store = configureStore({
      reducer: {
        panel: panelReducer,
        designerOptions: (state = initialOptions, action: UnknownAction) =>
          updateHostOptions.match(action) ? { ...state, ...action.payload } : state,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    if (selectedId !== null) {
      store.dispatch(setSelectedNodeId(selectedId));
    }
    const dispatch = vi.spyOn(store, 'dispatch');
    const onNavigate = vi.fn();
    const canvasRef = createRef<HTMLElement>();
    const flowRef: { current?: ReactFlowInstance } = {};
    const Details = () => {
      const { selectedNodeId = '', selectedNodeActiveTabId } = useSelector((state: { panel: PanelState }) => state.panel.operationContent);
      const tabs = [
        { id: 'PARAMETERS', title: 'Parameters', visible: true, order: 0, content: <div>{selectedNodeId} parameters</div> },
        ...(selectedNodeId === 'Last'
          ? []
          : [{ id: 'SETTINGS', title: 'Settings', visible: true, order: 1, content: <div>{selectedNodeId} settings</div> }]),
        { id: 'ABOUT', title: 'About', visible: true, order: 2, content: <div>{selectedNodeId} about</div> },
      ];
      return (
        <PanelContent
          nodeId={selectedNodeId}
          tabs={tabs}
          selectedTab={selectedNodeActiveTabId}
          selectTab={(tabId) => store.dispatch(setSelectedPanelActiveTab(tabId))}
          trackEvent={vi.fn()}
        />
      );
    };
    const Harness = () => {
      flowRef.current = useReactFlow();
      return (
        <section ref={canvasRef} data-testid="canvas" tabIndex={0} aria-label="Workflow canvas">
          <div data-testid="last-dom-node" tabIndex={0}>
            Last in graph, first in DOM
          </div>
          <div data-testid="first-dom-node" tabIndex={0}>
            First in graph, last in DOM
          </div>
          <input aria-label="Input editor" />
          <select aria-label="Select editor">
            <option>Value</option>
          </select>
          <textarea aria-label="Textarea editor" />
          <div data-testid="rich-editor" contentEditable suppressContentEditableWarning>
            <span data-testid="rich-editor-child">Editable</span>
          </div>
          <Navigation canvasRef={canvasRef} onNavigate={onNavigate} />
          {includePanel ? (
            <>
              <button type="button" onClick={() => store.dispatch(changePanelNode('Scope'))}>
                Select scope
              </button>
              <button type="button" onClick={() => store.dispatch(changePanelNode('Last'))}>
                Select last
              </button>
            </>
          ) : null}
        </section>
      );
    };
    const result = render(
      <Provider store={store}>
        <div data-testid="outside" tabIndex={0}>
          Outside the canvas
        </div>
        <ReactFlowProvider defaultNodes={nodes}>
          <Harness />
        </ReactFlowProvider>
        {includePanel ? <Details /> : null}
      </Provider>
    );
    return { ...result, store, dispatch, onNavigate, flowRef };
  };

  const press = (key: 'ArrowDown' | 'ArrowUp', modifiers: KeyboardEventInit = { ctrlKey: true }, target = screen.getByTestId('canvas')) => {
    target.focus();
    const event = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true, ...modifiers });
    fireEvent(target, event);
    fireEvent.keyUp(target, { key, code: key, ...modifiers });
    return event;
  };

  afterEach(cleanup);

  describe.each(['ctrlKey', 'metaKey'] as const)('real %s arrow events', (modifier) => {
    const modifiers = { [modifier]: true };

    it('selects the normalized scope action and focuses the actual graph card, not the DOM order', () => {
      const { store, dispatch, onNavigate } = setup();
      const event = press('ArrowDown', modifiers, screen.getByTestId('last-dom-node'));
      expect(event.defaultPrevented).toBe(true);
      expect(dispatch).toHaveBeenNthCalledWith(1, changePanelNode('Scope'));
      expect(dispatch).toHaveBeenNthCalledWith(2, setFocusNode('Scope-#scope'));
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
      expect(store.getState().panel.isCollapsed).toBe(false);
      expect(onNavigate).toHaveBeenCalledOnce();
      expect(onNavigate.mock.invocationCallOrder[0]).toBeLessThan(dispatch.mock.invocationCallOrder[0]);
    });

    it('uses fresh selection and getNodes state repeatedly, including an offscreen node absent from the DOM', async () => {
      const { store, dispatch, flowRef } = setup();
      press('ArrowDown', modifiers);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
      const moved = operation('NewOffscreen', 30, { position: { x: -20000, y: 20000 } });
      act(() => flowRef.current?.setNodes((nodes) => [moved, ...nodes]));
      await waitFor(() => expect(flowRef.current?.getNodes().some(({ id }) => id === 'NewOffscreen')).toBe(true));
      press('ArrowDown', modifiers);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('NewOffscreen');
      expect(dispatch).toHaveBeenLastCalledWith(setFocusNode('NewOffscreen'));
      expect(screen.queryByText('NewOffscreen')).not.toBeInTheDocument();
      press('ArrowUp', modifiers);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
      press('ArrowUp', modifiers);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('First');
    });

    it('uses updated host callbacks and suppression for consecutive commands without remounting', () => {
      const originalCallback = vi.fn();
      const replacementCallback = vi.fn();
      const { store, dispatch } = setup({ callback: originalCallback });
      const canvas = screen.getByTestId('canvas');
      press('ArrowDown', modifiers, canvas);
      expect(originalCallback).toHaveBeenCalledExactlyOnceWith('Scope');

      act(() =>
        store.dispatch(
          updateHostOptions({
            suppressDefaultNodeSelectFunctionality: true,
            nodeSelectAdditionalCallback: replacementCallback,
          })
        )
      );
      dispatch.mockClear();
      press('ArrowDown', modifiers, canvas);
      expect(dispatch).toHaveBeenNthCalledWith(1, setSelectedNodeId('Last'));
      expect(dispatch).toHaveBeenNthCalledWith(2, setFocusNode('Last'));
      expect(replacementCallback).toHaveBeenCalledExactlyOnceWith('Last');
      expect(originalCallback).toHaveBeenCalledOnce();

      act(() =>
        store.dispatch(updateHostOptions({ suppressDefaultNodeSelectFunctionality: false, nodeSelectAdditionalCallback: undefined }))
      );
      dispatch.mockClear();
      press('ArrowUp', modifiers, canvas);
      expect(dispatch).toHaveBeenNthCalledWith(1, changePanelNode('Scope'));
      expect(dispatch).toHaveBeenNthCalledWith(2, setFocusNode('Scope-#scope'));
      expect(replacementCallback).toHaveBeenCalledOnce();
      expect(screen.getByTestId('canvas')).toBe(canvas);
    });

    it.each([
      ['ArrowDown', 'Last'],
      ['ArrowUp', 'First'],
    ] as const)('prevents browser scrolling at the %s endpoint without wrapping or invoking callbacks', (key, selectedId) => {
      const callback = vi.fn();
      const { dispatch, onNavigate, store } = setup({ selectedId, callback });
      expect(press(key, modifiers).defaultPrevented).toBe(true);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe(selectedId);
      expect(dispatch).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it.each([
      ['ArrowDown', 'First'],
      ['ArrowUp', 'Last'],
    ] as const)('chooses %s from no selection or stale selection', (key, expected) => {
      const { store, dispatch } = setup({ selectedId: null });
      press(key, modifiers);
      expect(store.getState().panel.operationContent.selectedNodeId).toBe(expected);
      act(() => store.dispatch(setSelectedNodeId('Deleted')));
      dispatch.mockClear();
      press(key, modifiers);
      expect(dispatch).toHaveBeenNthCalledWith(1, changePanelNode(expected));
    });

    it('ignores events outside the supplied canvas without preventing their default behavior', () => {
      const { dispatch, onNavigate } = setup();
      expect(press('ArrowDown', modifiers, screen.getByTestId('outside')).defaultPrevented).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it.each(['Input editor', 'Select editor', 'Textarea editor', 'rich-editor', 'rich-editor-child'])(
      'leaves both arrow directions to %s',
      (editor) => {
        const { dispatch, onNavigate } = setup();
        const target = editor.startsWith('rich-') ? screen.getByTestId(editor) : screen.getByLabelText(editor);
        if (editor.startsWith('rich-')) {
          // JSDOM does not implement the inherited isContentEditable browser property.
          Object.defineProperty(target, 'isContentEditable', { value: true });
        }
        expect(press('ArrowDown', modifiers, target).defaultPrevented).toBe(false);
        expect(press('ArrowUp', modifiers, target).defaultPrevented).toBe(false);
        expect(dispatch).not.toHaveBeenCalled();
        expect(onNavigate).not.toHaveBeenCalled();
      }
    );
  });

  it.each([{ ctrlKey: true, shiftKey: true }, { metaKey: true, altKey: true }, { ctrlKey: true, metaKey: true }, {}])(
    'does not consume unregistered modifier combinations %j',
    (modifiers) => {
      const { dispatch } = setup();
      expect(press('ArrowDown', modifiers).defaultPrevented).toBe(false);
      expect(press('ArrowUp', modifiers).defaultPrevented).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    }
  );

  it.each([false, true])('calls the host with normalized IDs while honoring suppression=%s', (suppress) => {
    const callback = vi.fn();
    const { store, dispatch, onNavigate } = setup({ suppress, callback });
    press('ArrowDown');
    expect(callback).toHaveBeenCalledExactlyOnceWith('Scope');
    expect(onNavigate.mock.invocationCallOrder[0]).toBeLessThan(callback.mock.invocationCallOrder[0]);
    expect(callback.mock.invocationCallOrder[0]).toBeLessThan(dispatch.mock.invocationCallOrder[0]);
    expect(dispatch).toHaveBeenNthCalledWith(1, suppress ? setSelectedNodeId('Scope') : changePanelNode('Scope'));
    expect(dispatch).toHaveBeenNthCalledWith(2, setFocusNode('Scope-#scope'));
    expect(store.getState().panel.isCollapsed).toBe(suppress);
  });

  it.each([{ readOnly: true }, { isMonitoringView: true }, { readOnly: true, isMonitoringView: true }])(
    'keeps non-editing navigation available in %j',
    (options) => {
      const { store, dispatch } = setup(options);
      press('ArrowDown');
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
      expect(dispatch.mock.calls.map(([action]) => action)).toEqual([changePanelNode('Scope'), setFocusNode('Scope-#scope')]);
    }
  );

  it('preserves pinned operation details using the real panel reducer', () => {
    const { store, dispatch } = setup();
    act(() => store.dispatch(setAlternateSelectedNode({ nodeId: 'Pinned', panelPersistence: 'pinned' })));
    dispatch.mockClear();
    press('ArrowDown');
    expect(store.getState().panel.operationContent.alternateSelectedNode).toMatchObject({ nodeId: 'Pinned', persistence: 'pinned' });
    expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
  });

  describe('operation details tab retention', () => {
    it.each(['click', 'ctrlKey', 'metaKey'] as const)('retains Settings when another node is selected by %s', (selection) => {
      const { store } = setup({ includePanel: true });
      fireEvent.click(screen.getByRole('tab', { name: 'Settings', exact: true }));
      expect(screen.getByText('First settings')).toBeVisible();
      if (selection === 'click') {
        fireEvent.click(screen.getByRole('button', { name: 'Select scope' }));
      } else {
        press('ArrowDown', { [selection]: true });
      }
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Scope');
      expect(store.getState().panel.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
      expect(screen.getByRole('tab', { name: 'Settings', exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Scope settings')).toBeVisible();
      expect(screen.queryByText('First settings')).not.toBeInTheDocument();
    });

    it.each(['click', 'ctrlKey', 'metaKey'] as const)('renders a valid fallback when %s selects a node without Settings', (selection) => {
      const { store } = setup({ includePanel: true, selectedId: 'Scope' });
      fireEvent.click(screen.getByRole('tab', { name: 'Settings', exact: true }));
      expect(screen.getByText('Scope settings')).toBeVisible();
      if (selection === 'click') {
        fireEvent.click(screen.getByRole('button', { name: 'Select last' }));
      } else {
        press('ArrowDown', { [selection]: true });
      }
      expect(store.getState().panel.operationContent.selectedNodeId).toBe('Last');
      expect(screen.queryByRole('tab', { name: 'Settings', exact: true })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Parameters', exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Last parameters')).toBeVisible();
      expect(screen.queryByText('Scope settings')).not.toBeInTheDocument();
    });

    it('keeps pinned and selected tab preferences independent while navigating', () => {
      const { store } = setup({ includePanel: true });
      act(() => {
        store.dispatch(setAlternateSelectedNode({ nodeId: 'Pinned', panelPersistence: 'pinned' }));
        store.dispatch(setPinnedPanelActiveTab('ABOUT'));
      });
      fireEvent.click(screen.getByRole('tab', { name: 'Settings', exact: true }));
      press('ArrowDown');
      expect(store.getState().panel.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
      expect(store.getState().panel.operationContent.alternateSelectedNode).toMatchObject({
        nodeId: 'Pinned',
        persistence: 'pinned',
        activeTabId: 'ABOUT',
      });
    });
  });

  if (setNodeSelection) {
    it.each([false, true])('replaces multiselection via the real reducer with suppression=%s', (suppress) => {
      const { store, dispatch } = setup({ suppress });
      act(() => store.dispatch(setNodeSelection(['First', 'Last'])));
      dispatch.mockClear();
      press('ArrowDown');
      expect(store.getState().panel.operationContent.selectedNodeIds).toEqual(['Scope']);
      expect(store.getState().panel.connectionContent.selectedNodeIds).toEqual(['Scope']);
      expect(store.getState().panel.operationContent.alternateSelectedNode?.nodeId).toBe('');
    });
  }

  it('consumes eligible shortcuts safely when no graph nodes are navigable', () => {
    const { dispatch, onNavigate } = setup({ nodes: [operation('Placeholder', 1, { type: 'PLACEHOLDER_NODE' })] });
    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(press('ArrowUp').defaultPrevented).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('unregisters shortcuts when the component unmounts', () => {
    const { unmount, dispatch } = setup();
    unmount();
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', ctrlKey: true, bubbles: true, cancelable: true });
    fireEvent(document, event);
    expect(event.defaultPrevented).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
};
