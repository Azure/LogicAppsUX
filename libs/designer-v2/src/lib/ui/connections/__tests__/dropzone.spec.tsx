import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropZone } from '../dropzone';

const state = vi.hoisted(() => ({
  shared: true,
  readOnly: false,
  dragging: false,
  a2a: false,
  upstreamAgent: false,
  withinAgent: false,
  dispatch: vi.fn(),
}));
vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: () => ({ current: null }) }));
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
vi.mock('../../../core/utils/clipboard', () => ({ retrieveClipboardData: async () => undefined }));
vi.mock('../../../core/actions/bjsworkflow/copypaste', () => ({ pasteOperation: vi.fn(), pasteScopeOperation: vi.fn() }));
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
  });
  const props = { graphId: 'root', parentId: 'source', childId: 'target', tabIndex: 7 };

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
