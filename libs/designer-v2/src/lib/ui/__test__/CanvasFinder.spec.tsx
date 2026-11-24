import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, render, screen } from '@testing-library/react';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useShouldNodeFocus } from '../../core/state/workflow/workflowSelectors';
import workflow, { expandCollapsedAction, initialWorkflowState, toggleCollapsedActionId } from '../../core/state/workflow/workflowSlice';
import { CanvasFinder } from '../CanvasFinder';
import { SharedActionCard } from '../CustomNodes/components/card/SharedActionCard';

const flow = vi.hoisted(() => ({
  nodes: [] as { id: string; type: string; internals: { positionAbsolute: { x: number; y: number } } }[],
  setCenter: vi.fn(),
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useReactFlow: () => ({ setCenter: flow.setCenter, getZoom: () => 1 }),
  useNodes: () => flow.nodes,
  useInternalNode: (id: string) => flow.nodes.find((node) => node.id === id),
}));

const node = (id: string, type: string) => ({ id, type, internals: { positionAbsolute: { x: 0, y: 0 } } });
const RestoredCard = ({ canvasId }: { canvasId: string }) => {
  const setFocus = useShouldNodeFocus('Root', canvasId);
  return (
    <SharedActionCard id="Root" title="Root action" titleLines={1} setFocus={setFocus} nodeIndex={1} drag={vi.fn()} dragPreview={vi.fn()} />
  );
};

afterEach(cleanup);

describe('shared summary focus handoff', () => {
  it.each([
    ['Root', WORKFLOW_NODE_TYPES.OPERATION_NODE],
    ['Root-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE],
    ['Root-#footer', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE],
  ])('waits for the restored %s card instead of consuming focus on the retired summary', async (canvasId, type) => {
    const store = configureStore({
      reducer: { workflow },
      preloadedState: { workflow: { ...initialWorkflowState, collapsedActionIds: { Root: true } } },
    });
    flow.nodes = [node('Root', WORKFLOW_NODE_TYPES.COLLAPSED_NODE)];
    flow.setCenter.mockReset().mockResolvedValue(true);
    const canvas = (layoutReady: boolean, cardVisible = false) => (
      <Provider store={store}>
        {!layoutReady && <button type="button">Collapsed summary</button>}
        {cardVisible && <RestoredCard canvasId={canvasId} />}
        <CanvasFinder />
      </Provider>
    );
    const view = render(canvas(false));
    screen.getByRole('button', { name: 'Collapsed summary' }).focus();
    flow.setCenter.mockClear();

    act(() => {
      store.dispatch(expandCollapsedAction('Root'));
    });
    expect(store.getState().workflow.collapsedActionIds).toEqual({});
    expect(store.getState().workflow.focusedCanvasNodeId).toBe('Root');
    expect(flow.setCenter).not.toHaveBeenCalled();

    let finishPan: (centered: boolean) => void = () => undefined;
    flow.setCenter.mockReturnValue(new Promise<boolean>((resolve) => (finishPan = resolve)));
    flow.nodes = canvasId === 'Root' ? [node(canvasId, type)] : [node('Root', WORKFLOW_NODE_TYPES.GRAPH_NODE), node(canvasId, type)];
    view.rerender(canvas(true));
    expect(flow.setCenter).toHaveBeenCalledTimes(1);
    expect(store.getState().workflow.focusedCanvasNodeId).toBe('Root');

    view.rerender(canvas(true, true));
    expect(document.activeElement).toBe(document.getElementById('msla-node-Root'));
    await act(async () => finishPan(true));
    expect(store.getState().workflow.focusedCanvasNodeId).toBeUndefined();
    expect(store.getState().workflow.focusExpandedActionId).toBeUndefined();
    expect(document.activeElement).toBe(document.getElementById('msla-node-Root'));
  });

  it('does not request the shared handoff on the legacy collapse toggle', () => {
    const collapsed = workflow(initialWorkflowState, toggleCollapsedActionId('Root'));
    const expanded = workflow(collapsed, toggleCollapsedActionId('Root'));
    expect(expanded.focusCollapsedNodeId).toBe('Root');
    expect(expanded.focusExpandedActionId).toBeUndefined();
    expect(expanded.focusedCanvasNodeId).toBeUndefined();
  });
});
