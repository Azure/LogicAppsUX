import { describe, expect, it } from 'vitest';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { agentMcpWorkflowDefinitionInput } from '../../parsers/BJSWorkflow/__test__/agentMcpWorkflowDefinition';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { exportForTesting } from '../elklayout';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { createDesignerStore } from '../../store';
import { setStateAfterUndoRedo } from '../../state/global';
import { setCollapsedGraphIds } from '../../state/workflow/workflowSlice';
import { useRootWorkflowGraphForLayout } from '../../state/workflow/workflowSelectors';

const agentId = 'PayloadDetailsAndCommitDiffAgent';
const toolId = 'Create_cherrypick_PRs';
const firstId = 'Send_an_HTTP_request_to_Azure_DevOps_2';
const lastId = 'Send_an_HTTP_request_to_Azure_DevOps_3';
const definition = () => ({
  ...agentMcpWorkflowDefinitionInput,
  triggers: { When_a_new_chat_session_starts: agentMcpWorkflowDefinitionInput.triggers.manual },
  actions: {
    [agentId]: {
      ...agentMcpWorkflowDefinitionInput.actions.WorkflowAgent,
      tools: {
        [toolId]: {
          type: 'AgentCondition',
          actions: {
            [firstId]: { type: 'Http', inputs: { uri: 'https://example.invalid', method: 'POST' }, runAfter: {} },
            Delay: { type: 'Wait', inputs: { interval: { count: 1, unit: 'Second' } }, runAfter: { [firstId]: ['SUCCEEDED'] } },
            [lastId]: {
              type: 'Http',
              inputs: { uri: 'https://example.invalid', method: 'GET' },
              runAfter: { Delay: ['SUCCEEDED'] },
            },
          },
        },
        Find_missing_commits: { type: 'AgentCondition', actions: { Find: { type: 'Compose', inputs: 'find', runAfter: {} } } },
        Get_commit_details: { type: 'AgentCondition', actions: { Get: { type: 'Compose', inputs: 'get', runAfter: {} } } },
        Send_teams_message_for_PR_details: {
          type: 'AgentCondition',
          actions: { Send: { type: 'Compose', inputs: 'send', runAfter: {} } },
        },
        McpFileServer: agentMcpWorkflowDefinitionInput.actions.WorkflowAgent.tools.McpFileServer,
      },
    },
  },
});

const findElkNode = (node: ElkNode, id: string): ElkNode | undefined =>
  node.id === id ? node : node.children?.map((child) => findElkNode(child, id)).find(Boolean);
const graphNodes = (node: WorkflowNode): WorkflowNode[] => [node, ...(node.children?.flatMap(graphNodes) ?? [])];
const graphEdges = (node: WorkflowNode): NonNullable<WorkflowNode['edges']> => [
  ...(node.edges ?? []),
  ...(node.children?.flatMap(graphEdges) ?? []),
];
const accept = async (source: Parameters<typeof Deserialize>[0], shared = true, readOnly = false) => {
  const parsed = Deserialize(source, null);
  const before = structuredClone(parsed);
  const converted = exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, shared, {
    operations: parsed.actionData,
    nodesMetadata: parsed.nodesMetadata,
  });
  const layout = await exportForTesting.elkLayout(converted, readOnly);
  const [nodes, edges] = exportForTesting.convertElkGraphToReactFlow(layout, shared);
  expect(parsed).toEqual(before);
  return { parsed, converted, layout, nodes, edges };
};

describe('actual deserialized tool-branch axis contracts', () => {
  it('keeps the concrete main DOWN, sibling inventory vertical and the three-action continuation RIGHT with real edges', async () => {
    const source = definition();
    const before = structuredClone(source);
    const { parsed, nodes, edges } = await accept(source);
    const get = (id: string) => nodes.find((node) => node.id === id)!;
    const main = get('When_a_new_chat_session_starts');
    const agent = get(agentId);
    expect(agent.position.y).toBeGreaterThanOrEqual(main.position.y + main.height! + 12);
    expect(main.data.handleAxis).toBe('vertical');
    expect(agent.data.handleAxis).toBe('vertical');
    expect(edges.find((edge) => edge.source === main.id && edge.target === agent.id)).toMatchObject({ type: 'BUTTON_EDGE' });
    const siblings = [toolId, 'Find_missing_commits', 'Get_commit_details', 'Send_teams_message_for_PR_details', 'McpFileServer'];
    for (const [index, id] of siblings.entries()) {
      expect(get(id).parentId).toBe(agentId);
      expect(get(id).data.handleAxis).toBe('vertical');
      if (index > 0) {
        const previous = get(siblings[index - 1]);
        expect(get(id).position.y).toBeGreaterThanOrEqual(previous.position.y + previous.height! + 12);
      }
    }
    const sequence = [`${toolId}-#subgraph`, firstId, 'Delay', lastId];
    for (const [index, id] of sequence.entries()) {
      const node = get(id);
      expect(node.parentId).toBe(toolId);
      expect(node.data.handleAxis).toBe('horizontal');
      expect(node.width).toBe(232);
      if (index > 0) {
        const previous = get(sequence[index - 1]);
        expect(node.position.x).toBeGreaterThanOrEqual(previous.position.x + previous.width! + 12);
        const realEdge = edges.find((edge) => edge.source === previous.id && edge.target === node.id)!;
        expect(realEdge).toBeDefined();
        expect(realEdge.hidden).not.toBe(true);
        const section = (realEdge.data!.elkEdge as ElkExtendedEdge).sections![0];
        expect(section.startPoint.x).toBeCloseTo(previous.position.x + previous.width!);
        expect(section.endPoint.x).toBeCloseTo(node.position.x);
        expect(section.startPoint.y).toBeCloseTo(previous.position.y + previous.height! / 2);
        expect(section.endPoint.y).toBeCloseTo(node.position.y + node.height! / 2);
      }
      expect(node.position.x + node.width!).toBeLessThanOrEqual(get(toolId).width!);
      expect(node.position.y + node.height!).toBeLessThanOrEqual(get(toolId).height!);
    }
    expect(nodes.map(({ id }) => id).sort()).toEqual(
      graphNodes(parsed.graph!)
        .filter(({ id }) => id !== 'root')
        .map(({ id }) => id)
        .sort()
    );
    expect(
      edges.map(({ id, source: from, target, type }) => ({ id, source: from, target, type })).sort((a, b) => a.id.localeCompare(b.id))
    ).toEqual(
      graphEdges(parsed.graph!)
        .map(({ id, source: from, target, type }) => ({ id, source: from, target, type }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );
    expect(source).toEqual(before);
    expect(parsed.actionData[lastId]).toMatchObject({ runAfter: { Delay: ['SUCCEEDED'] } });
    expect(parsed.nodesMetadata[firstId]).toMatchObject({ graphId: toolId, parentNodeId: agentId });
  });

  it('keeps unequal tool branches inventory-aligned by visible ToolItem headers while preserving rightward inner actions', async () => {
    const { nodes } = await accept(definition());
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const absolutePosition = (id: string) => {
      const node = nodeById.get(id)!;
      let x = node.position.x;
      let y = node.position.y;
      let parent = node.parentId ? nodeById.get(node.parentId) : undefined;
      while (parent) {
        x += parent.position.x;
        y += parent.position.y;
        parent = parent.parentId ? nodeById.get(parent.parentId) : undefined;
      }
      return { x, y };
    };
    const inventory = [toolId, 'Find_missing_commits', 'Get_commit_details', 'Send_teams_message_for_PR_details'];
    const firstHeader = nodeById.get(`${toolId}-#subgraph`)!;
    const firstHeaderPosition = absolutePosition(firstHeader.id);
    const allowedXDrift = (firstHeader.width ?? 232) * 0.25;

    expect(nodes.filter((node) => node.parentId === toolId && !node.id.endsWith('#subgraph'))).toHaveLength(3);
    for (const tool of inventory.slice(1)) {
      expect(nodes.filter((node) => node.parentId === tool && !node.id.endsWith('#subgraph'))).toHaveLength(1);
    }

    for (const [index, id] of inventory.entries()) {
      const toolRoot = nodeById.get(id)!;
      const header = nodeById.get(`${id}-#subgraph`)!;
      const headerPosition = absolutePosition(header.id);
      expect(Math.abs(headerPosition.x - firstHeaderPosition.x)).toBeLessThanOrEqual(allowedXDrift);
      if (index > 0) {
        const previous = nodeById.get(inventory[index - 1])!;
        expect(toolRoot.position.y).toBeGreaterThanOrEqual(previous.position.y + previous.height! + 12);
      }
    }

    const branch = [`${toolId}-#subgraph`, firstId, 'Delay', lastId];
    for (const [index, id] of branch.entries()) {
      if (index > 0) {
        const current = nodeById.get(id)!;
        const previous = nodeById.get(branch[index - 1])!;
        expect(current.position.x).toBeGreaterThanOrEqual(previous.position.x + previous.width! + 12);
      }
    }
  });

  it('leaves actual legacy tool continuations DOWN when the shared presentation option is off', async () => {
    const { layout, nodes } = await accept(definition(), false);
    const tool = findElkNode(layout, toolId)!;
    expect(tool.layoutOptions?.['elk.direction']).toBe('DOWN');
    const first = findElkNode(tool, firstId)!;
    const delay = findElkNode(tool, 'Delay')!;
    expect(delay.y).toBeGreaterThanOrEqual(first.y! + first.height! + 12);
    expect(nodes.find(({ id }) => id === firstId)!.data.handleAxis).toBe('vertical');
  });

  it.each([
    { shared: true, empty: false, readOnly: false, right: 40, bottom: 20 },
    { shared: true, empty: true, readOnly: false, right: 60, bottom: 20 },
    { shared: false, empty: false, readOnly: false, right: 20, bottom: 40 },
    { shared: false, empty: true, readOnly: false, right: 20, bottom: 60 },
    { shared: true, empty: false, readOnly: true, right: 40, bottom: 20 },
    { shared: true, empty: true, readOnly: true, right: 60, bottom: 20 },
  ])(
    'reserves real Tool terminal space: shared=$shared empty=$empty readOnly=$readOnly',
    async ({ shared, empty, readOnly, right, bottom }) => {
      const source = definition();
      const tool = source.actions[agentId].tools[toolId];
      const { converted, layout } = await accept(
        {
          ...source,
          actions: {
            [agentId]: {
              ...source.actions[agentId],
              tools: { [toolId]: { ...tool, actions: empty ? {} : tool.actions } },
            },
          },
        },
        shared,
        readOnly
      );
      expect(findElkNode(converted, toolId)!.layoutOptions?.['elk.padding']).toBe(`[top=0,left=20,bottom=${bottom},right=${right}]`);
      const acceptedTool = findElkNode(layout, toolId)!;
      const children = acceptedTool.children!;
      // Legacy ReactFlow dimensions are measured later; ELK already has the actual compound/header bounds.
      const rightmost = Math.max(...children.map((child) => child.x! + child.width!));
      const lowest = Math.max(...children.map((child) => child.y! + child.height!));
      expect(acceptedTool.width! - rightmost).toBeGreaterThanOrEqual(right);
      expect(acceptedTool.height! - lowest).toBeGreaterThanOrEqual(bottom);
      expect(findElkNode(layout, toolId)!.layoutOptions?.['elk.direction']).toBe(shared ? 'RIGHT' : 'DOWN');
      expect(children).toHaveLength(empty ? 1 : 4);
    }
  );

  it.each([true, false])('lays out actual collapsedActionIds without losing the incoming Tool edge (shared=%s)', async (shared) => {
    const source = definition();
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
          collapsedActionIds: { [firstId]: true },
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
    const collapsed = nodes.find(({ id }) => id === firstId)!;
    expect(collapsed.type).toBe('COLLAPSED_NODE');
    expect(collapsed.data.handleAxis).toBe(shared ? 'horizontal' : 'vertical');
    expect(nodes.some(({ id }) => id === 'Delay' || id === lastId)).toBe(false);
    expect(edges.find(({ source: from, target }) => from === `${toolId}-#subgraph` && target === firstId)).toMatchObject({
      id: `${toolId}-#subgraph-${firstId}`,
      type: 'HEADING_EDGE',
    });
    expect(store.getState().workflow.graph).toEqual(parsed.graph);
    expect(store.getState().workflow.operations).toEqual(parsed.actionData);
    view.unmount();
  });

  it('collapses and re-expands the real multi-action tool without altering IDs, associations or serializer inputs', async () => {
    const source = definition();
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
          originalDefinition: source,
        },
      })
    );
    const original = structuredClone(store.getState().workflow);
    const view = renderHook(useRootWorkflowGraphForLayout, {
      wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
    });
    const layoutView = async () =>
      exportForTesting.convertElkGraphToReactFlow(
        await exportForTesting.elkLayout(
          exportForTesting.convertWorkflowGraphToElkGraph(view.result.current!, true, {
            operations: parsed.actionData,
            nodesMetadata: parsed.nodesMetadata,
          })
        ),
        true
      );
    const [expanded, originalEdges] = await layoutView();
    act(() => store.dispatch(setCollapsedGraphIds([toolId])));
    const [collapsed, collapsedEdges] = await layoutView();
    expect(collapsed.some(({ id }) => id === firstId || id === 'Delay' || id === lastId)).toBe(false);
    expect(collapsed.find(({ id }) => id === toolId)!.width).toBeLessThan(expanded.find(({ id }) => id === toolId)!.width!);
    expect(collapsedEdges.find(({ source, target }) => source === `${agentId}-#scope` && target === toolId)).toMatchObject({
      id: `${agentId}-#scope-${toolId}`,
      hidden: true,
    });
    expect(collapsed.find(({ id }) => id === 'McpFileServer')).toBeDefined();
    expect(collapsed.find(({ id }) => id === agentId)!.data.handleAxis).toBe('vertical');
    act(() => store.dispatch(setCollapsedGraphIds([])));
    const [restored, restoredEdges] = await layoutView();
    expect(restored.map(({ id }) => id).sort()).toEqual(expanded.map(({ id }) => id).sort());
    expect(restoredEdges.map(({ id }) => id).sort()).toEqual(originalEdges.map(({ id }) => id).sort());
    expect(restored.find(({ id }) => id === lastId)!.position.x).toBeGreaterThan(restored.find(({ id }) => id === 'Delay')!.position.x);
    expect(store.getState().workflow.graph).toEqual(original.graph);
    expect(store.getState().workflow.operations).toEqual(original.operations);
    expect(store.getState().workflow.nodesMetadata).toEqual(original.nodesMetadata);
    expect(JSON.stringify(store.getState().workflow.originalDefinition)).toBe(JSON.stringify(source));
    view.unmount();
  });

  it.each(['Scope', 'Foreach', 'If'])('keeps nested %s bodies inside their accepted frame and real container bounds', async (type) => {
    const source = definition();
    const inner = { Body: { type: 'Compose', inputs: 'body', runAfter: {} } };
    const nested = {
      type,
      actions: inner,
      ...(type === 'Foreach' && { foreach: '@createArray(1)' }),
      ...(type === 'If' && { expression: { equals: [1, 1] }, else: { actions: {} } }),
      runAfter: {},
    };
    const nestedSource = {
      ...source,
      actions: {
        [agentId]: {
          ...source.actions[agentId],
          tools: {
            ...source.actions[agentId].tools,
            [toolId]: {
              type: 'AgentCondition',
              actions: { Nested: nested, After_nested: { type: 'Compose', inputs: 'after', runAfter: { Nested: ['SUCCEEDED'] } } },
            },
          },
        },
      },
    };
    const { nodes, edges } = await accept(nestedSource);
    const container = nodes.find(({ id }) => id === 'Nested')!;
    const body = nodes.find(({ id }) => id === 'Body')!;
    const after = nodes.find(({ id }) => id === 'After_nested')!;
    expect(container.data.handleAxis).toBe('horizontal');
    expect(after.position.x).toBeGreaterThanOrEqual(container.position.x + container.width! + 12);
    expect(edges.find((edge) => edge.source === container.id && edge.target === after.id)).toBeDefined();
    for (const child of nodes.filter(({ parentId }) => parentId === container.id)) {
      expect(child.position.x).toBeGreaterThanOrEqual(0);
      expect(child.position.y).toBeGreaterThanOrEqual(0);
      expect(child.position.x + child.width!).toBeLessThanOrEqual(container.width!);
      expect(child.position.y + child.height!).toBeLessThanOrEqual(container.height!);
    }
    if (type === 'Foreach') {
      expect(body.parentId).toBe(container.id);
      const frame = container.data.bodyFrame as { y: number; height: number };
      expect(body.position.y).toBeGreaterThanOrEqual(frame.y);
      expect(body.position.y + body.height!).toBeLessThanOrEqual(frame.y + frame.height);
    }
  });

  it('matches named If branch ELK ports to the rendered horizontal source side inside a tool', async () => {
    const parsed = Deserialize(
      {
        ...definition(),
        actions: {
          [agentId]: {
            ...definition().actions[agentId],
            tools: {
              [toolId]: {
                type: 'AgentCondition',
                actions: {
                  Nested_if: { type: 'If', expression: { equals: [1, 1] }, actions: {}, else: { actions: {} }, runAfter: {} },
                },
              },
            },
          },
        },
      },
      null
    );
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, true, {
      operations: parsed.actionData,
      nodesMetadata: parsed.nodesMetadata,
    });
    const layout = await exportForTesting.elkLayout(converted);
    const [nodes, edges] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    expect(nodes.find(({ id }) => id === 'Nested_if-#scope')!.data.handleAxis).toBe('horizontal');
    expect(edges.filter(({ source }) => source === 'Nested_if-#scope')).toHaveLength(2);
    const header = findElkNode(converted, 'Nested_if-#scope')!;
    expect(header.ports).toHaveLength(2);
    for (const port of header.ports!) {
      expect(port.layoutOptions?.['elk.port.side']).toBe('EAST');
      expect(port.x).toBe(header.width);
      expect(port.y).toBeGreaterThan(0);
      expect(port.y).toBeLessThan(header.height!);
    }
  });

  it('keeps a nested Agent tool inventory vertical independently of its enclosing rightward action continuation', async () => {
    const source = definition();
    const { nodes, edges, parsed, converted } = await accept({
      ...source,
      actions: {
        [agentId]: {
          ...source.actions[agentId],
          tools: {
            [toolId]: {
              type: 'AgentCondition',
              actions: {
                Nested_agent: {
                  ...agentMcpWorkflowDefinitionInput.actions.WorkflowAgent,
                  runAfter: {},
                  tools: {
                    Inner_tool: {
                      type: 'AgentCondition',
                      actions: {
                        Inner_first: { type: 'Compose', inputs: 'first', runAfter: {} },
                        Inner_second: { type: 'Compose', inputs: 'second', runAfter: { Inner_first: ['SUCCEEDED'] } },
                      },
                    },
                    Inner_mcp: agentMcpWorkflowDefinitionInput.actions.WorkflowAgent.tools.McpFileServer,
                  },
                },
                After_agent: { type: 'Compose', inputs: 'after', runAfter: { Nested_agent: ['SUCCEEDED'] } },
              },
            },
          },
        },
      },
    });
    const get = (id: string) => nodes.find((node) => node.id === id)!;
    expect(get('Nested_agent').data.handleAxis).toBe('horizontal');
    expect(get('Inner_tool').parentId).toBe('Nested_agent');
    expect(get('Inner_mcp').parentId).toBe('Nested_agent');
    expect(get('Inner_mcp').position.y).toBeGreaterThanOrEqual(get('Inner_tool').position.y + get('Inner_tool').height! + 12);
    expect(get('Inner_tool').data.handleAxis).toBe('vertical');
    expect(get('Inner_mcp').data.handleAxis).toBe('vertical');
    expect(get('Inner_second').position.x).toBeGreaterThanOrEqual(get('Inner_first').position.x + get('Inner_first').width! + 12);
    expect(get('Inner_second').data.handleAxis).toBe('horizontal');
    expect(findElkNode(converted, 'Nested_agent')!.layoutOptions?.['elk.direction']).toBe('DOWN');
    expect(get('Nested_agent-#scope').data.handleAxis).toBe('vertical');
    const compound = get('Nested_agent');
    const following = get('After_agent');
    const edge = edges.find(({ source: from, target }) => from === compound.id && target === following.id)!;
    expect(edge.id).toBe('Nested_agent-After_agent');
    const section = (edge.data!.elkEdge as ElkExtendedEdge).sections![0];
    expect(section.startPoint.x).toBeCloseTo(compound.position.x + compound.width!);
    expect(section.startPoint.y).toBeCloseTo(compound.position.y + compound.height! / 2);
    expect(section.endPoint.x).toBeCloseTo(following.position.x);
    expect(section.endPoint.y).toBeCloseTo(following.position.y + following.height! / 2);
    expect(edges.map(({ id }) => id).sort()).toEqual(
      graphEdges(parsed.graph!)
        .map(({ id }) => id)
        .sort()
    );
  });
});
