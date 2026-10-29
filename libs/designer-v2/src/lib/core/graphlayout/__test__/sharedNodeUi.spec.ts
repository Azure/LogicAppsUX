import { describe, expect, it } from 'vitest';
import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { exportForTesting } from '../elklayout';
import { createWorkflowEdge, createWorkflowNode } from '../../utils/graph';
import type { ElkNode } from 'elkjs';
import reducer, { initDesignerOptions, initialDesignerOptionsState } from '../../state/designerOptions/designerOptionsSlice';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import workflowReducer, { initialWorkflowState, updateNodeSizes } from '../../state/workflow/workflowSlice';
import { getLayoutRelevantData } from '../helpers';
import { updateChildrenDimensions } from '../../parsers/ParseReduxAction';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createDesignerStore } from '../../store';
import { setStateAfterUndoRedo } from '../../state/global';
import { onRedoClick, onUndoClick, storeStateToUndoRedoHistory } from '../../actions/bjsworkflow/undoRedo';
import { setCollapsedGraphIds } from '../../state/workflow/workflowSlice';
import { useRootWorkflowGraphForLayout } from '../../state/workflow/workflowSelectors';

describe('shared node renderer geometry option', () => {
  const graph: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('action'),
      createWorkflowNode('scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
      createWorkflowNode('placeholder', WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE),
      { id: 'nested', type: WORKFLOW_NODE_TYPES.GRAPH_NODE, children: [createWorkflowNode('nestedAction')] },
    ],
  };

  it('defaults off, accepts the public provider option and resets on omitted option', () => {
    expect(initialDesignerOptionsState.useSharedNodeUi).toBe(false);
    const enabled = reducer(undefined, initDesignerOptions({ ...initialDesignerOptionsState, useSharedNodeUi: true }));
    expect(enabled.useSharedNodeUi).toBe(true);
    expect(reducer(enabled, initDesignerOptions({ hostOptions: { displayRuntimeInfo: true } })).useSharedNodeUi).toBe(false);
  });

  it('preserves all legacy geometry when disabled', () => {
    const result = exportForTesting.convertWorkflowGraphToElkGraph(graph);
    expect(result.children?.slice(0, 3).map(({ width, height }) => ({ width, height }))).toEqual([
      { width: 200, height: 40 },
      { width: 200, height: 40 },
      { width: 200, height: 40 },
    ]);
  });

  it('retains the measured legacy operation height instead of forcing the factory default', () => {
    const measured = {
      ...graph,
      children: [{ ...createWorkflowNode('measured'), width: 200, height: 64 }],
    };
    const result = exportForTesting.convertWorkflowGraphToElkGraph(measured, false);
    expect(result.children?.[0]).toMatchObject({ width: 200, height: 64 });
  });

  it('sizes adopted operations and placeholders without guessing a scope family absent its definition', () => {
    const result = exportForTesting.convertWorkflowGraphToElkGraph(graph, true);
    expect(result.children?.[0]).toMatchObject({ width: 232, height: 74 });
    expect(result.children?.[1]).toMatchObject({ width: 200, height: 40 });
    expect(result.children?.[2]).toMatchObject({ width: 232, height: 74 });
    expect(result.children?.[3].children?.[0]).toMatchObject({ width: 232, height: 74 });
    expect(graph.children?.[0]).toMatchObject({ width: 200, height: 40 });
  });

  it('passes adopted dimensions to XYFlow for viewport centering without changing legacy node objects', async () => {
    const elkGraph = exportForTesting.convertWorkflowGraphToElkGraph(graph, true);
    const layout = await exportForTesting.elkLayout(elkGraph);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    expect(nodes.find(({ id }) => id === 'action')).toMatchObject({ width: 232, height: 74 });
    expect(nodes.find(({ id }) => id === 'scope')).not.toHaveProperty('width');
    const [accepted] = exportForTesting.convertElkGraphToReactFlow(layout);
    expect(accepted.find(({ id }) => id === 'action')?.data.presentation).toMatchObject({ shared: true });
    const legacyLayout = await exportForTesting.elkLayout(exportForTesting.convertWorkflowGraphToElkGraph(graph));
    const [legacy] = exportForTesting.convertElkGraphToReactFlow(legacyLayout);
    expect(legacy.find(({ id }) => id === 'action')).not.toHaveProperty('width');
  });

  it('rolls back to persisted legacy measurements without persisting shared renderer geometry', () => {
    const measured = workflowReducer(
      { ...initialWorkflowState, graph },
      updateNodeSizes([
        { id: 'action', type: 'dimensions', dimensions: { width: 200, height: 64 } },
        { id: 'scope', type: 'dimensions', dimensions: { width: 321, height: 123 } },
      ])
    );
    const enabled = exportForTesting.convertWorkflowGraphToElkGraph(measured.graph!, true);
    expect(enabled.children?.[0]).toMatchObject({ width: 232, height: 74 });
    expect(measured.graph?.children?.[0]).toMatchObject({ width: 200, height: 64 });
    const rollback = exportForTesting.convertWorkflowGraphToElkGraph(measured.graph!, false);
    expect(rollback.children?.[0]).toMatchObject({ width: 200, height: 64 });
    expect(rollback.children?.[1]).toMatchObject({ width: 321, height: 123 });
    const enabledAgain = exportForTesting.convertWorkflowGraphToElkGraph(measured.graph!, true);
    expect(enabledAgain.children?.[0]).toMatchObject({ width: 232, height: 74 });
    expect(enabledAgain.children?.[1]).toMatchObject({ width: 321, height: 123 });
    expect(measured.graph?.children?.[0]).toMatchObject({ width: 200, height: 64 });
  });

  it('records an actual default-sized observation without changing the layout cache projection', () => {
    const observed = workflowReducer(
      { ...initialWorkflowState, graph },
      updateNodeSizes([{ id: 'action', type: 'dimensions', dimensions: { width: 200, height: 40 } }])
    );
    expect(observed.graph?.children?.[0]).toMatchObject({ width: 200, height: 40, dimensionsObserved: true });
    expect(getLayoutRelevantData(observed.graph)).toEqual(getLayoutRelevantData(graph));
    expect(graph.children?.[0]).not.toHaveProperty('dimensionsObserved');
  });

  it('does not mark an unobserved node when a zero-sized observation is rejected', () => {
    const observed = workflowReducer(
      { ...initialWorkflowState, graph },
      updateNodeSizes([{ id: 'action', type: 'dimensions', dimensions: { width: 0, height: 64 } }])
    );
    expect(observed.graph?.children?.[0]).toEqual(graph.children?.[0]);
    expect(observed.graph?.children?.[0]).not.toHaveProperty('dimensionsObserved');
  });

  it('carries real observations through reparsing and real ELK without imposing fixed native sizes', async () => {
    const observed = workflowReducer(
      { ...initialWorkflowState, graph },
      updateNodeSizes([{ id: 'action', type: 'dimensions', dimensions: { width: 200, height: 64 } }])
    );
    const reparsed = [createWorkflowNode('action'), createWorkflowNode('new')];
    updateChildrenDimensions(reparsed, observed.graph!.children!);
    expect(reparsed[0]).toMatchObject({ width: 200, height: 64, dimensionsObserved: true });
    expect(reparsed[1]).not.toHaveProperty('dimensionsObserved');
    const layout = await exportForTesting.elkLayout(exportForTesting.convertWorkflowGraphToElkGraph({ ...graph, children: reparsed }));
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, false, true);
    const accepted = nodes.find(({ id }) => id === 'action')!;
    const elkNode = layout.children!.find(({ id }) => id === 'action')!;
    expect(accepted.measured).toEqual({ width: elkNode.width, height: elkNode.height });
    expect(accepted.measured).toEqual({ width: 200, height: 64 });
    expect(accepted).not.toHaveProperty('width');
    expect(accepted).not.toHaveProperty('height');
    expect(accepted).not.toHaveProperty('style');
    expect(nodes.find(({ id }) => id === 'new')).not.toHaveProperty('measured');
    const [firstMount] = exportForTesting.convertElkGraphToReactFlow(layout, false, false);
    expect(firstMount.find(({ id }) => id === 'action')).not.toHaveProperty('measured');
    const sharedLayout = await exportForTesting.elkLayout(exportForTesting.convertWorkflowGraphToElkGraph(observed.graph!, true));
    const [shared] = exportForTesting.convertElkGraphToReactFlow(sharedLayout, true, true);
    expect(shared.find(({ id }) => id === 'action')).not.toHaveProperty('measured');
  });

  it('updates a later real size without freezing the previously observed native dimensions', async () => {
    const first = workflowReducer(
      { ...initialWorkflowState, graph },
      updateNodeSizes([{ id: 'action', type: 'dimensions', dimensions: { width: 200, height: 64 } }])
    );
    const changed = workflowReducer(first, updateNodeSizes([{ id: 'action', type: 'dimensions', dimensions: { width: 210, height: 96 } }]));
    expect(changed.graph?.children?.[0]).toMatchObject({ width: 210, height: 96, dimensionsObserved: true });
    const layout = await exportForTesting.elkLayout(exportForTesting.convertWorkflowGraphToElkGraph(changed.graph!));
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, false, true);
    expect(nodes.find(({ id }) => id === 'action')?.measured).toEqual({ width: 210, height: 96 });
  });

  it('restores observations atomically through real undo and redo and retains them through collapse and expand', async () => {
    const store = createDesignerStore();
    store.dispatch(setStateAfterUndoRedo({ ...store.getState(), workflow: { ...initialWorkflowState, graph } }));
    await store.dispatch(storeStateToUndoRedoHistory({ type: 'observed-dimensions-test' })).unwrap();
    store.dispatch(updateNodeSizes([{ id: 'nestedAction', type: 'dimensions', dimensions: { width: 200, height: 64 } }]));
    const nestedAction = () => store.getState().workflow.graph!.children![3].children![0];
    expect(nestedAction()).toMatchObject({ width: 200, height: 64, dimensionsObserved: true });
    await store.dispatch(onUndoClick()).unwrap();
    expect(nestedAction()).toMatchObject({ width: 200, height: 40 });
    expect(nestedAction()).not.toHaveProperty('dimensionsObserved');
    await store.dispatch(onRedoClick()).unwrap();
    expect(nestedAction()).toMatchObject({ width: 200, height: 64, dimensionsObserved: true });

    const view = renderHook(() => useRootWorkflowGraphForLayout(), {
      wrapper: ({ children }: { children: ReactNode }) => createElement(Provider, { store, children }),
    });
    act(() => store.dispatch(setCollapsedGraphIds(['nested'])));
    expect(view.result.current!.children![3].children).toHaveLength(0);
    expect(nestedAction()).toMatchObject({ width: 200, height: 64, dimensionsObserved: true });
    act(() => store.dispatch(setCollapsedGraphIds([])));
    expect(view.result.current!.children![3].children![0]).toMatchObject({ width: 200, height: 64, dimensionsObserved: true });
    view.unmount();
  });

  it('preserves host edge types, visual ordering, nested parent IDs and traversal indices', () => {
    const laidOut: ElkNode = {
      id: 'root',
      width: 100,
      height: 50,
      children: [
        { id: 'late', x: 30, y: 10, width: 232, height: 74 },
        { id: 'early', x: 20, y: 10, width: 232, height: 74 },
        {
          id: 'container',
          x: 2,
          y: 200,
          width: 500,
          height: 300,
          layoutOptions: { nodeType: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE },
          children: [{ id: 'nested', width: 232, height: 74 }],
        },
      ],
      edges: [
        {
          id: 'edge',
          sources: ['early'],
          targets: ['late'],
          layoutOptions: { edgeType: WORKFLOW_EDGE_TYPES.HIDDEN_EDGE },
        },
      ],
    };
    const [nodes, edges, size] = exportForTesting.convertElkGraphToReactFlow(laidOut, true);
    expect(nodes.map(({ id }) => id)).toEqual(['early', 'late', 'container', 'nested']);
    expect(nodes[0].data).toMatchObject({ nodeIndex: 1, nodeLeafIndex: 3 });
    expect(edges[0]).toMatchObject({ source: 'early', target: 'late', type: WORKFLOW_EDGE_TYPES.HIDDEN_EDGE, data: { edgeIndex: 2 } });
    expect(nodes[2].data.size).toEqual({ width: 500, height: 300 });
    expect(nodes[3]).toMatchObject({ parentId: 'container', position: { x: 0, y: 0 } });
    expect(size).toEqual([502, 500]);
  });

  it('filters orphan edges and retains only-edge and nested/footer layout spacing', () => {
    const root: WorkflowNode = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('one'), createWorkflowNode('two')],
      edges: [
        createWorkflowEdge('one', 'two', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
        createWorkflowEdge('missing', 'two'),
        createWorkflowEdge('one', 'missing'),
      ],
    };
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(root);
    expect(converted.edges).toHaveLength(1);
    expect(converted.edges?.[0]).toMatchObject({
      sources: ['one'],
      targets: ['two'],
      layoutOptions: { edgeType: WORKFLOW_EDGE_TYPES.ONLY_EDGE },
    });
    expect(converted.layoutOptions).toMatchObject({
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.layered.spacing.nodeNodeBetweenLayers': '20',
    });
    const singleScope = exportForTesting.convertWorkflowGraphToElkGraph({
      ...root,
      edges: [],
      children: [createWorkflowNode('scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
    });
    expect(singleScope.layoutOptions?.['elk.padding']).toBe('[top=0,left=20,bottom=60,right=20]');
    const nested = exportForTesting.convertWorkflowGraphToElkGraph({
      ...root,
      edges: [],
      children: [
        createWorkflowNode('scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
        createWorkflowNode('hidden', WORKFLOW_NODE_TYPES.HIDDEN_NODE),
      ],
    });
    expect(nested.layoutOptions?.['elk.padding']).toBe('[top=0,left=20,bottom=20,right=20]');
    const footer = exportForTesting.convertWorkflowGraphToElkGraph({
      ...root,
      edges: [],
      children: [createWorkflowNode('node#footer')],
    });
    expect(footer.layoutOptions?.['elk.padding']).toBe('[top=0,left=20,bottom=0,right=20]');
  });
});
