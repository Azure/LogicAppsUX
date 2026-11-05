import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { getBezierPath, Position, ReactFlow, type EdgeTypes, type Node, type NodeProps } from '@xyflow/react';
import { EdgeDrawSourceHandle } from '../EdgeDrawSourceHandle';
import { EdgeDrawTargetHandle } from '../EdgeDrawTargetHandle';
import { DefaultHandle } from '../DefaultHandle';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import type { ElkExtendedEdge } from 'elkjs';
import type { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SharedBranchCard, SharedScopeCard } from '../../card/SharedFamilyCards';
import ButtonEdge from '../../../../connections/edge';
import { exportForTesting } from '../../../../../core/graphlayout/elklayout';
import { Deserialize } from '../../../../../core/parsers/BJSWorkflow/BJSDeserializer';
import { agentMcpWorkflowDefinitionInput } from '../../../../../core/parsers/BJSWorkflow/__test__/agentMcpWorkflowDefinition';
import { Provider } from 'react-redux';
import { createDesignerStore } from '../../../../../core/store';
import { setStateAfterUndoRedo } from '../../../../../core/state/global';
import { useRootWorkflowGraphForLayout } from '../../../../../core/state/workflow/workflowSelectors';
import CollapsedNode from '../../../CollapsedCardNode';
import GraphContainerNode from '../../../GraphContainerNode';

const options = vi.hoisted(() => ({ readOnly: false, shared: false }));
vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => options.shared,
  useReadOnly: () => options.readOnly,
  useMonitoringView: () => false,
}));

type AxisNode = Node<{ handleAxis?: 'vertical' | 'horizontal'; title?: string; contained?: boolean }>;
const ActualCard = ({ data }: NodeProps<AxisNode>) => (
  <>
    <EdgeDrawTargetHandle axis={data.handleAxis} />
    <EdgeDrawSourceHandle axis={data.handleAxis} />
  </>
);
const ActualBranch = () => (
  <NodeHandle variant="success">
    <DefaultHandle type="source" id="real-branch" contained />
  </NodeHandle>
);
const ActualDefaultSource = ({ data }: NodeProps<AxisNode>) => {
  const source = <DefaultHandle type="source" id="structural-source" axis={data.handleAxis} contained={data.contained} />;
  return data.contained ? <NodeHandle>{source}</NodeHandle> : source;
};
const selectTool = vi.fn();
const collapseTool = vi.fn();
// These are the real slots passed by SubgraphCardNode, not substituted Handle elements.
const ActualTool = ({ id, data }: NodeProps<AxisNode>) => (
  <SharedBranchCard
    id={id}
    title={data.title ?? 'Create cherrypick PRs'}
    subgraphType={SUBGRAPH_TYPES.AGENT_CONDITION}
    handleAxis={data.handleAxis}
    inputSlot={<DefaultHandle axis={data.handleAxis} type="target" />}
    outputSlot={<DefaultHandle axis={data.handleAxis} type="source" />}
    selected
    onClick={selectTool}
    onCollapse={collapseTool}
  />
);
const ActualCondition = ({ id, data }: NodeProps<AxisNode>) => (
  <SharedScopeCard
    id={id}
    title="Nested condition"
    family="if"
    operationType="If"
    drag={vi.fn()}
    dragPreview={vi.fn()}
    caseCount={2}
    handleAxis={data.handleAxis}
    inputSlot={<EdgeDrawTargetHandle axis={data.handleAxis} contained />}
    outputSlots={[
      <DefaultHandle key="true" axis={data.handleAxis} id="actual-true" contained type="source" />,
      <DefaultHandle key="false" axis={data.handleAxis} id="actual-false" contained type="source" />,
    ]}
  />
);
const types = {
  actual: ActualCard,
  branch: ActualBranch,
  tool: ActualTool,
  condition: ActualCondition,
  defaultSource: ActualDefaultSource,
  collapsed: CollapsedNode,
  agentGraph: GraphContainerNode,
};
// Match DesignerReactFlow's existing registration type assertion.
const edgeTypes = { HEADING_EDGE: ButtonEdge } as EdgeTypes;

const acceptWorkflow = async (source: Parameters<typeof Deserialize>[0], shared: boolean, collapsedId?: string) => {
  const parsed = Deserialize(source, null);
  const store = createDesignerStore();
  store.dispatch(
    setStateAfterUndoRedo({
      ...store.getState(),
      workflow: {
        ...store.getState().workflow,
        graph: parsed.graph,
        operations: parsed.actionData,
        nodesMetadata: parsed.nodesMetadata,
        collapsedActionIds: collapsedId ? { [collapsedId]: true } : {},
      },
    })
  );
  const view = renderHook(useRootWorkflowGraphForLayout, {
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  });
  const [nodes, edges] = exportForTesting.convertElkGraphToReactFlow(
    await exportForTesting.elkLayout(
      exportForTesting.convertWorkflowGraphToElkGraph(view.result.current!, shared, {
        operations: parsed.actionData,
        nodesMetadata: parsed.nodesMetadata,
      })
    ),
    shared
  );
  view.unmount();
  return { parsed, store, nodes, edges };
};

describe('shared visuals contain actual XYFlow ports', () => {
  beforeEach(() => {
    options.readOnly = false;
    options.shared = false;
    selectTool.mockClear();
    collapseTool.mockClear();
  });
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });
  afterAll(() => vi.unstubAllGlobals());

  it('retains the actual source/target hit elements and connection permissions under accepted shared geometry', () => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          {
            id: 'real-operation',
            type: 'actual',
            position: { x: 0, y: 0 },
            width: 232,
            height: 74,
            data: { presentation: { shared: true } },
          },
        ]}
      />
    );
    const ports = container.querySelectorAll('.react-flow__handle');
    expect(ports).toHaveLength(2);
    expect(container.querySelector('.react-flow__handle.source')).toHaveClass('connectablestart');
    expect(container.querySelector('.react-flow__handle.source')).not.toHaveClass('connectableend');
    expect(container.querySelector('.react-flow__handle.target')).toHaveClass('connectableend');
    expect(container.querySelector('.react-flow__handle.target')).not.toHaveClass('connectablestart');
    expect(container.querySelectorAll('.react-flow__handle [data-handle]')).toHaveLength(2);
    expect(container.querySelectorAll('.react-flow__handle[data-handleid]')).toHaveLength(0);
  });

  it('registers the host-provided branch handle identity inside one canonical slot without making it draw-connectable', () => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          {
            id: 'real-condition',
            type: 'branch',
            position: { x: 0, y: 0 },
            width: 160,
            height: 74,
            data: { presentation: { shared: true } },
          },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-handle="success"]')).toHaveLength(1);
    const port = container.querySelector<HTMLElement>('.react-flow__handle');
    expect(port).toHaveAttribute('data-nodeid', 'real-condition');
    expect(port).toHaveAttribute('data-handleid', 'real-branch');
    expect(port).not.toHaveClass('connectable');
    expect(container.querySelector('[data-handle="success"]')).toContainElement(port);
  });

  it.each(['vertical', 'horizontal'] as const)('registers real %s operation ports without changing connection permissions', (axis) => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          { id: 'actual-action', type: 'actual', position: { x: 0, y: 0 }, data: { presentation: { shared: true }, handleAxis: axis } },
        ]}
      />
    );
    const target = container.querySelector('.react-flow__handle.target')!;
    const source = container.querySelector('.react-flow__handle.source')!;
    expect(target).toHaveAttribute('data-nodeid', 'actual-action');
    expect(source).toHaveAttribute('data-nodeid', 'actual-action');
    expect(target).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-left' : 'react-flow__handle-top');
    expect(source).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-right' : 'react-flow__handle-bottom');
    expect(source).toHaveClass('connectablestart');
    expect(target).toHaveClass('connectableend');
  });

  it.each(
    (['vertical', 'horizontal'] as const).flatMap((axis) =>
      [false, true].flatMap((shared) => [false, true].map((contained) => ({ axis, shared, contained })))
    )
  )(
    'registers the real DefaultHandle and computed source CSS: axis=$axis shared=$shared contained=$contained',
    ({ axis, shared, contained }) => {
      options.shared = !shared;
      const { container } = render(
        <ReactFlow
          width={600}
          height={400}
          nodeTypes={types}
          nodes={[
            {
              id: 'default-source',
              type: 'defaultSource',
              position: { x: 0, y: 0 },
              width: 232,
              height: 74,
              data: { presentation: { shared }, handleAxis: axis, contained },
            },
          ]}
        />
      );
      const source = container.querySelector<HTMLElement>('.react-flow__handle.source')!;
      const computed = getComputedStyle(source);
      expect(source).toHaveAttribute('data-nodeid', 'default-source');
      expect(source).toHaveAttribute('data-handleid', 'structural-source');
      expect(source).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-right' : 'react-flow__handle-bottom');
      expect(source).not.toHaveClass('connectable');
      expect(computed.visibility).toBe(shared && contained ? 'visible' : 'hidden');
      if (shared && contained) {
        expect(source).toHaveAttribute('data-port-contained', 'true');
        expect(source.style).toMatchObject({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
        expect(computed.backgroundColor).toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
        expect(source.closest('[data-handle]')).toBeInTheDocument();
      } else {
        expect(source).not.toHaveAttribute('data-port-contained');
        expect(source.style.left).not.toBe('50%');
        expect(computed.transform).toBe(
          shared
            ? axis === 'horizontal'
              ? 'translateY(-50%)'
              : 'translateX(-50%)'
            : axis === 'horizontal'
              ? 'translate(0%, -50%)'
              : 'translate(-50%, 0%)'
        );
        if (shared) {
          expect(axis === 'horizontal' ? computed.right : computed.bottom).toBe('-7px');
        }
      }
    }
  );

  it.each([
    { shared: true, insideTool: true, axis: 'horizontal' },
    { shared: true, insideTool: false, axis: 'vertical' },
    { shared: false, insideTool: true, axis: 'vertical' },
  ])(
    'renders actual collapsedActionIds through CollapsedCardNode: shared=$shared insideTool=$insideTool',
    async ({ shared, insideTool, axis }) => {
      const original = agentMcpWorkflowDefinitionInput;
      const actions = {
        First: { type: 'Compose', inputs: 'first', runAfter: {} },
        Second: { type: 'Compose', inputs: 'second', runAfter: { First: ['SUCCEEDED'] } },
        Third: { type: 'Compose', inputs: 'third', runAfter: { Second: ['SUCCEEDED'] } },
      };
      const source = {
        ...original,
        actions: insideTool
          ? {
              WorkflowAgent: { ...original.actions.WorkflowAgent, tools: { Actual_tool: { type: 'AgentCondition', actions } } },
            }
          : actions,
      };
      const { nodes, store, parsed } = await acceptWorkflow(source, shared, 'First');
      const collapsed = nodes.find(({ id }) => id === 'First')!;
      expect(collapsed.type).toBe(WORKFLOW_NODE_TYPES.COLLAPSED_NODE);
      expect(collapsed.data.handleAxis).toBe(axis);
      expect(nodes.some(({ id }) => id === 'Second' || id === 'Third')).toBe(false);
      const { container } = render(
        <Provider store={store}>
          <ReactFlow width={1200} height={600} nodeTypes={types} nodes={[{ ...collapsed, type: 'collapsed', parentId: undefined }]} />
        </Provider>
      );
      const target = container.querySelector('.react-flow__handle.target')!;
      const output = container.querySelector('.react-flow__handle.source')!;
      expect(target).toHaveAttribute('data-nodeid', 'First');
      expect(output).toHaveAttribute('data-nodeid', 'First');
      expect(target).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-left' : 'react-flow__handle-top');
      expect(output).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-right' : 'react-flow__handle-bottom');
      expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(2);
      expect(store.getState().workflow.collapsedActionIds).toEqual({ First: true });
      expect(store.getState().workflow.graph).toEqual(parsed.graph);
      expect(store.getState().workflow.operations).toEqual(parsed.actionData);
    }
  );

  it.each(['horizontal', 'vertical'] as const)('uses the real %s Agent structural source and actual outgoing ELK edge', async (axis) => {
    const original = agentMcpWorkflowDefinitionInput;
    const actions = {
      Nested_agent: {
        ...original.actions.WorkflowAgent,
        runAfter: {},
        tools: { Inner_tool: { type: 'AgentCondition', actions: { Inside: { type: 'Compose', inputs: 'inside', runAfter: {} } } } },
      },
      After_agent: { type: 'Compose', inputs: 'after', runAfter: { Nested_agent: ['SUCCEEDED'] } },
    };
    const source = {
      ...original,
      actions:
        axis === 'horizontal'
          ? {
              WorkflowAgent: { ...original.actions.WorkflowAgent, tools: { Actual_tool: { type: 'AgentCondition', actions } } },
            }
          : actions,
    };
    const { nodes, edges, store } = await acceptWorkflow(source, true);
    const compound = nodes.find(({ id }) => id === 'Nested_agent')!;
    const following = nodes.find(({ id }) => id === 'After_agent')!;
    expect(compound.data.handleAxis).toBe(axis);
    expect(nodes.find(({ id }) => id === 'Nested_agent-#scope')!.data.handleAxis).toBe('vertical');
    const edge = edges.find(({ source: from, target }) => from === compound.id && target === following.id)!;
    expect(edge.id).toBe('Nested_agent-After_agent');
    const section = (edge.data!.elkEdge as ElkExtendedEdge).sections![0];
    if (axis === 'horizontal') {
      expect(section.startPoint.x).toBeCloseTo(compound.position.x + compound.width!);
      expect(section.startPoint.y).toBeCloseTo(compound.position.y + compound.height! / 2);
      expect(section.endPoint.x).toBeCloseTo(following.position.x);
    }
    const { container } = render(
      <Provider store={store}>
        <DndProvider backend={HTML5Backend}>
          <ReactFlow width={1600} height={1200} nodeTypes={types} nodes={[{ ...compound, type: 'agentGraph', parentId: undefined }]} />
        </DndProvider>
      </Provider>
    );
    const sourceHandle = container.querySelector<HTMLElement>('.react-flow__handle.source')!;
    expect(sourceHandle).toHaveAttribute('data-nodeid', compound.id);
    expect(sourceHandle).toHaveClass(axis === 'horizontal' ? 'react-flow__handle-right' : 'react-flow__handle-bottom');
    expect(sourceHandle).toHaveClass('connectablestart');
    if (axis === 'horizontal') {
      expect(sourceHandle).not.toHaveAttribute('data-port-contained');
      expect(sourceHandle.style.left).not.toBe('50%');
      expect(getComputedStyle(sourceHandle).right).toBe('-7px');
      expect(getComputedStyle(sourceHandle).transform).toBe('translateY(-50%)');
      expect(sourceHandle.querySelector('[data-handle]')).toBeInTheDocument();
    } else {
      expect(sourceHandle).toHaveAttribute('data-port-contained', 'true');
      expect(sourceHandle.style).toMatchObject({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
      expect(sourceHandle.querySelector('[data-handle]')).toBeNull();
    }
  });

  it.each(['Create cherrypick PRs', 'Send_teams_message_for_PR_details', 'Post_or_Patch_Azure_DevOps_REST_API'])(
    'keeps a selected horizontal tool row within accepted width with real ports and its full label: %s',
    (title) => {
      const { container, getByRole } = render(
        <ReactFlow
          width={1200}
          height={400}
          nodeTypes={types}
          nodes={[
            {
              id: 'Create_cherrypick_PRs-#subgraph',
              type: 'tool',
              position: { x: 20, y: 0 },
              width: 232,
              height: 56,
              data: { presentation: { shared: true }, handleAxis: 'horizontal', title },
            },
          ]}
        />
      );
      const wrapper = container.querySelector<HTMLElement>('.react-flow__node[data-id="Create_cherrypick_PRs-#subgraph"]')!;
      const card = container.querySelector<HTMLElement>('[data-node-id="Create_cherrypick_PRs-#subgraph"]')!;
      const target = container.querySelector<HTMLElement>('.react-flow__handle.target')!;
      const source = container.querySelector<HTMLElement>('.react-flow__handle.source')!;
      expect(wrapper).toBeInTheDocument();
      expect(card).toBeInTheDocument();
      expect(getComputedStyle(wrapper).width).toBe('232px');
      expect(getComputedStyle(card.parentElement!).width).toBe('100%');
      expect(getComputedStyle(card).width).toBe('100%');
      expect(card).toHaveAttribute('id', 'msla-node-Create_cherrypick_PRs-#subgraph');
      expect(target).toHaveAttribute('data-nodeid', 'Create_cherrypick_PRs-#subgraph');
      expect(source).toHaveAttribute('data-nodeid', 'Create_cherrypick_PRs-#subgraph');
      expect(container.querySelector('[data-node-card="tool"]')).toHaveAttribute('data-handle-axis', 'horizontal');
      expect(target).toHaveClass('react-flow__handle-left');
      expect(source).toHaveClass('react-flow__handle-right');
      expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(2);
      const tool = getByRole('button', { name: `Tool: ${title}` });
      expect(tool).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(tool);
      expect(selectTool).toHaveBeenCalledTimes(1);
      fireEvent.click(getByRole('button', { name: 'Collapse' }));
      expect(collapseTool).toHaveBeenCalledTimes(1);
      expect(selectTool).toHaveBeenCalledTimes(1);
    }
  );

  it('does not center both real tool continuation endpoints over the card content instead of its left/right perimeter', () => {
    const { container } = render(
      <ReactFlow
        width={1200}
        height={400}
        nodeTypes={types}
        nodes={[
          { id: 'actual-tool', type: 'tool', position: { x: 0, y: 0 }, data: { presentation: { shared: true }, handleAxis: 'horizontal' } },
        ]}
      />
    );
    const target = container.querySelector<HTMLElement>('.react-flow__handle.target')!;
    const source = container.querySelector<HTMLElement>('.react-flow__handle.source')!;
    // ToolItemCard has no NodeHandle slots: "contained" must not place naked ports at its center.
    expect(target.closest('[data-handle]')).toBeNull();
    expect(source.closest('[data-handle]')).toBeNull();
    expect(target.style.left).not.toBe('50%');
    expect(source.style.left).not.toBe('50%');
  });

  it('registers horizontal named condition ports inside the actual canonical output dots', () => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          {
            id: 'Nested_if-#scope',
            type: 'condition',
            position: { x: 0, y: 0 },
            data: { presentation: { shared: true }, handleAxis: 'horizontal' },
          },
        ]}
      />
    );
    const outputs = container.querySelector('[data-testid="node-output-handles"]')!;
    expect(outputs).toHaveAttribute('data-axis', 'horizontal');
    expect(outputs.querySelectorAll('.react-flow__handle.source')).toHaveLength(2);
    expect(outputs.querySelector('[data-handle="success"] .react-flow__handle')).toHaveAttribute('data-handleid', 'actual-true');
    expect(outputs.querySelector('[data-handle="danger"] .react-flow__handle')).toHaveAttribute('data-handleid', 'actual-false');
    expect(outputs.querySelector('[data-handleid="actual-true"]')).toHaveClass('react-flow__handle-right');
  });

  it('renders the actual deserialized tool-body edge through XYFlow and the registered heading-edge renderer', async () => {
    const original = agentMcpWorkflowDefinitionInput;
    const parsed = Deserialize(
      {
        ...original,
        actions: {
          WorkflowAgent: {
            ...original.actions.WorkflowAgent,
            tools: {
              NativeTool: {
                type: 'AgentCondition',
                actions: {
                  First: { type: 'Compose', inputs: 'first', runAfter: {} },
                  Second: { type: 'Compose', inputs: 'second', runAfter: { First: ['SUCCEEDED'] } },
                },
              },
            },
          },
        },
      },
      null
    );
    const [accepted, edges] = exportForTesting.convertElkGraphToReactFlow(
      await exportForTesting.elkLayout(
        exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph, true, {
          operations: parsed.actionData,
          nodesMetadata: parsed.nodesMetadata,
        })
      ),
      true
    );
    // JSDOM cannot measure the real browser. Supply perimeter bounds to XYFlow's supported initial-handle API,
    // while separately asserting real DOM registration and the tool perimeter defect above.
    const nodes = accepted
      .filter(({ parentId }) => parentId === 'NativeTool')
      .map((node) => ({
        ...node,
        type: 'actual',
        parentId: undefined,
        handles: [
          { type: 'target' as const, position: Position.Left, x: 0, y: node.height! / 2, width: 0, height: 0 },
          { type: 'source' as const, position: Position.Right, x: node.width!, y: node.height! / 2, width: 0, height: 0 },
        ],
      }));
    const edge = edges.find(({ source, target }) => source === 'NativeTool-#subgraph' && target === 'First')!;
    expect(edge.type).toBe('HEADING_EDGE');
    const store = createDesignerStore();
    store.dispatch(
      setStateAfterUndoRedo({
        ...store.getState(),
        workflow: {
          ...store.getState().workflow,
          graph: parsed.graph,
          operations: parsed.actionData,
          nodesMetadata: parsed.nodesMetadata,
        },
      })
    );
    options.readOnly = true;
    const { container } = render(
      <Provider store={store}>
        <ReactFlow width={1200} height={400} nodeTypes={types} edgeTypes={edgeTypes} nodes={nodes} edges={[edge]} />
      </Provider>
    );
    const from = nodes.find(({ id }) => id === edge.source)!;
    const to = nodes.find(({ id }) => id === edge.target)!;
    const [expectedPath] = getBezierPath({
      sourceX: from.position.x + from.width!,
      sourceY: from.position.y + from.height! / 2,
      targetX: to.position.x,
      targetY: to.position.y + to.height! / 2,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
    const path = container.querySelector('.msla-shared-edge-path')!;
    expect(path).toHaveAttribute('id', edge.id);
    expect(path).toHaveAttribute('d', expectedPath);
    expect(container.querySelector('[data-edge-hit-target]')).toBeInTheDocument();
    expect(container.querySelectorAll('.react-flow__handle-right')).toHaveLength(nodes.length);
  });
});
