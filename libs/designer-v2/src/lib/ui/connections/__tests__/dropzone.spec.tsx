import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropZone } from '../dropzone';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

const state = vi.hoisted(() => ({
  shared: true,
  readOnly: false,
  dragging: false,
  a2a: false,
  upstreamAgent: false,
  withinAgent: false,
  dispatch: vi.fn(),
  clipboard: undefined as Record<string, unknown> | undefined,
  readClipboard: vi.fn(),
  hotkey: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch }));
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (_keys: string[], callback: () => Promise<void>) => {
    state.hotkey = callback;
    return { current: null };
  },
}));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => state.shared,
  useReadOnly: () => state.readOnly,
  useIsDarkMode: () => false,
}));
vi.mock('../../../core/state/designerView/designerViewSelectors', () => ({ useIsA2AWorkflow: () => state.a2a }));
vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useNodeMetadata: () => ({ graphId: 'root' }),
  useNodeDisplayName: (id: string) => id || '',
  useHasUpstreamAgenticLoop: () => state.upstreamAgent,
  useIsWithinAgenticLoop: () => state.withinAgent,
}));
vi.mock('../../../core/state/tokens/tokenSelectors', () => ({ useUpstreamNodes: () => new Set(['source']) }));
vi.mock('../../../core/hooks/useIsDraggingNode', () => ({ useIsDraggingNode: () => state.dragging }));
vi.mock('../../../core/utils/clipboard', () => ({
  retrieveClipboardData: async () => {
    state.readClipboard();
    return state.clipboard;
  },
}));
vi.mock('../../../core/actions/bjsworkflow/copypaste', () => ({
  pasteOperation: (payload: unknown) => ({ type: 'pasteOperation', payload }),
  pasteScopeOperation: (payload: unknown) => ({ type: 'pasteScopeOperation', payload }),
}));
vi.mock('../dropTarget', () => ({
  DropTarget: ({ graphId, parentId, childId, preventDropItemInA2A }: any) => (
    <div data-testid="drop-target" data-graph={graphId} data-parent={parentId} data-child={childId} data-prevent={preventDropItemInA2A} />
  ),
}));

describe('shared insertion uses the real host menu and DnD boundary', () => {
  beforeEach(() => {
    state.shared = true;
    state.readOnly = false;
    state.dragging = false;
    state.a2a = false;
    state.upstreamAgent = false;
    state.withinAgent = false;
    state.dispatch.mockClear();
    state.clipboard = undefined;
    state.readClipboard.mockClear();
    state.hotkey = undefined;
    vi.spyOn(LoggerService(), 'log');
  });
  afterEach(() => vi.restoreAllMocks());
  const props = { graphId: 'root', parentId: 'source', childId: 'target', tabIndex: 7 };
  const settlePaste = async () => {
    await waitFor(() =>
      expect(LoggerService().log).toHaveBeenCalledWith({
        area: 'DropZone:handlePasteClicked',
        level: LogEntryLevel.Verbose,
        message: 'New node added via paste.',
      })
    );
  };

  it('does not paste when the actual clipboard boundary has no node', async () => {
    render(<DropZone {...props} />);
    await state.hotkey!();
    expect(state.readClipboard).toHaveBeenCalledOnce();
    expect(state.dispatch).not.toHaveBeenCalled();
  });

  it.each(['read-only', 'upstream-agent'])('guards the paste shortcut before reading the clipboard for %s', async (boundary) => {
    state.readOnly = boundary === 'read-only';
    state.a2a = boundary === 'upstream-agent';
    state.upstreamAgent = boundary === 'upstream-agent';
    render(<DropZone {...props} />);
    await state.hotkey!();
    expect(state.readClipboard).not.toHaveBeenCalled();
    expect(state.dispatch).not.toHaveBeenCalled();
  });

  it('pastes scopes and operations in reverse insertion order while preserving their own payloads', async () => {
    const operation = { nodeId: 'first', nodeData: { inputs: 'value' }, nodeComment: 'keep comment' };
    const scope = {
      nodeId: 'scope',
      isScopeNode: true,
      serializedOperation: { type: 'Scope', actions: {} },
      allConnectionData: { binding: 'actual' },
      staticResults: { result: 'kept' },
    };
    state.clipboard = { isMultiNode: true, nodes: [operation, scope] };
    let resolveScope!: () => void;
    let resolveOperation!: () => void;
    const scopeFinished = new Promise<void>((resolve) => {
      resolveScope = resolve;
    });
    const operationFinished = new Promise<void>((resolve) => {
      resolveOperation = resolve;
    });
    state.dispatch.mockReturnValueOnce(scopeFinished).mockReturnValueOnce(operationFinished);
    render(<DropZone {...props} />);
    await state.hotkey!();
    try {
      await waitFor(() => expect(state.dispatch).toHaveBeenCalledOnce());
      expect(LoggerService().log).not.toHaveBeenCalledWith(expect.objectContaining({ area: 'DropZone:handlePasteClicked' }));
      resolveScope();
      await waitFor(() => expect(state.dispatch).toHaveBeenCalledTimes(2));
      expect(LoggerService().log).not.toHaveBeenCalledWith(expect.objectContaining({ area: 'DropZone:handlePasteClicked' }));
    } finally {
      resolveScope();
      resolveOperation();
      await settlePaste();
    }
    expect(state.dispatch.mock.calls.map(([action]) => action)).toEqual([
      {
        type: 'pasteScopeOperation',
        payload: {
          relationshipIds: { graphId: 'root', parentId: 'source', childId: 'target' },
          nodeId: 'scope',
          serializedValue: scope.serializedOperation,
          allConnectionData: scope.allConnectionData,
          staticResults: scope.staticResults,
          upstreamNodeIds: new Set(['source']),
        },
      },
      {
        type: 'pasteOperation',
        payload: {
          relationshipIds: { graphId: 'root', parentId: 'source', childId: 'target' },
          nodeId: 'first',
          nodeData: operation.nodeData,
          nodeTokenData: undefined,
          operationInfo: undefined,
          connectionData: undefined,
          comment: 'keep comment',
        },
      },
    ]);
  });

  it('pastes a single operation through the same insertion relationship', async () => {
    state.clipboard = { nodeId: 'single', nodeData: { inputs: 'value' } };
    render(<DropZone {...props} />);
    await state.hotkey!();
    await waitFor(() => expect(state.dispatch).toHaveBeenCalledOnce());
    await settlePaste();
    expect(state.dispatch.mock.calls[0][0]).toMatchObject({
      type: 'pasteOperation',
      payload: { nodeId: 'single', relationshipIds: { graphId: 'root', parentId: 'source', childId: 'target' } },
    });
  });

  it('reveals insertion on hover and focus, then hides it only after focus leaves its owned control', () => {
    const { container } = render(<DropZone {...props} isRevealed={false} />);
    const control = container.querySelector('[data-edge-control]')!;
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(control);
    expect(control).toHaveAttribute('data-revealed', 'true');
    fireEvent.mouseLeave(control);
    expect(control).toHaveAttribute('data-revealed', 'false');
    fireEvent.focus(button);
    fireEvent.blur(button, { relatedTarget: button });
    expect(control).toHaveAttribute('data-revealed', 'true');
    fireEvent.blur(button, { relatedTarget: document.body });
    expect(control).toHaveAttribute('data-revealed', 'false');
  });
  it.each(['{Enter}', ' '])('reveals on focus and %s opens the actual menu exactly once without bubbling', async (key) => {
    const bubble = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <div onClick={bubble}>
        <DropZone {...props} isRevealed={false} />
      </div>
    );
    const button = screen.getByRole('button');
    expect(container.querySelector('[data-edge-control]')).toHaveAttribute('data-revealed', 'false');
    expect(button).toHaveAttribute('tabindex', '7');
    button.focus();
    fireEvent.focus(button);
    expect(container.querySelector('[data-edge-control]')).toHaveAttribute('data-revealed', 'true');
    await user.keyboard(key);
    expect(state.dispatch).toHaveBeenCalledTimes(1);
    expect(state.dispatch.mock.calls[0][0].payload).toMatchObject({ graphId: 'root', parentId: 'source', childId: 'target' });
    expect(bubble).not.toHaveBeenCalled();
  });

  it('preserves right-click relationship IDs and automation identity on the new control', () => {
    render(<DropZone {...props} isRevealed />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-automation-id', 'msla-plus-button-source-target');
    fireEvent.contextMenu(button);
    expect(state.dispatch).toHaveBeenCalledTimes(1);
    expect(state.dispatch.mock.calls[0][0].payload).toMatchObject({
      graphId: 'root',
      parentId: 'source',
      childId: 'target',
      isLeaf: false,
    });
  });

  it('retains a terminal NodeAdd surface rather than an invisible edge pill', () => {
    const { container } = render(<DropZone graphId="nested" parentId="last" isLeaf />);
    expect(container.querySelector('[data-edge-control]')).toHaveAttribute('data-edge-control', 'terminal');
    expect(container.querySelector('[data-line="dashedNeutral"]')).toHaveAttribute('height', '8');
    expect(container.querySelector('[data-handle]')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(state.dispatch.mock.calls[0][0].payload).toMatchObject({ graphId: 'nested', parentId: 'last', isLeaf: true });
  });

  it('disables the flagged mutation surface when read-only and never dispatches', () => {
    state.readOnly = true;
    render(<DropZone {...props} />);
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(state.dispatch).not.toHaveBeenCalled();
  });

  it('retains real A2A drop restrictions instead of replacing DnD with the shared button', () => {
    state.dragging = true;
    state.a2a = true;
    state.upstreamAgent = true;
    render(<DropZone {...props} />);
    expect(screen.getByTestId('drop-target')).toHaveAttribute('data-prevent', 'true');
    expect(screen.getByTestId('drop-target')).toHaveAttribute('data-child', 'target');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('allows a drop inside a different Agent graph and preserves flag-off markup', () => {
    state.dragging = true;
    state.a2a = true;
    state.upstreamAgent = true;
    state.withinAgent = true;
    const { rerender, container } = render(<DropZone {...props} />);
    expect(screen.getByTestId('drop-target')).toHaveAttribute('data-prevent', 'false');
    state.dragging = false;
    state.shared = false;
    rerender(<DropZone {...props} tabIndex={8} />);
    expect(container.querySelector('.msla-drop-zone-viewmanager')).toBeInTheDocument();
    expect(container.querySelector('[data-edge-control]')).toBeNull();
  });

  it('keeps accepted legacy controls while the option changes before layout acceptance', () => {
    const { container } = render(<DropZone {...props} sharedPresentation={false} />);
    expect(container.querySelector('.msla-drop-zone-viewmanager')).toBeInTheDocument();
    expect(container.querySelector('[data-edge-control]')).toBeNull();
  });
});
