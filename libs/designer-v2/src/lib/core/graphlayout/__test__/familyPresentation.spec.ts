import { describe, expect, it } from 'vitest';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getNodePresentation } from '../../utils/graph';
import { exportForTesting } from '../elklayout';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import {
  agentMcpWorkflowDefinitionInput,
  expectedAgentMcpWorkflowDefinitionOutput,
} from '../../parsers/BJSWorkflow/__test__/agentMcpWorkflowDefinition';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getWorkflowNodePresentationContext } from '../helpers';
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { initialWorkflowState } from '../../state/workflow/workflowSlice';
import { useRootWorkflowGraphForLayout } from '../../state/workflow/workflowSelectors';
import Constants from '../../../common/constants';

describe('family admission and matching geometry', () => {
  it.each([
    ['Scope', 'scope', 232, 74],
    ['If', 'if', 160, 74],
    ['Switch', 'switch', 160, 74],
    ['Foreach', 'loop', 160, 74],
    ['Until', 'loop', 160, 74],
    ['Agent', 'agent', 280, 181],
  ])('admits renamed %s by definition, not display name', (operationType, family, width, height) => {
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, { operationType })).toMatchObject({
      shared: true,
      family,
      size: { width, height },
    });
  });

  it('uses explicit branch roles and never promotes hidden structure or notes to cards', () => {
    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, true, { subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE })
    ).toMatchObject({ shared: true, family: 'branch' });
    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, true, { subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION })
    ).toMatchObject({ shared: true, family: 'tool' });
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.HIDDEN_NODE, true).shared).toBe(false);
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.NOTE_NODE, true).shared).toBe(false);
  });

  it('admits only actual direct Agent/MCP tool rows at canonical small height, not their multi-action descendants', () => {
    const context = {
      operations: { agent: { type: 'Agent' }, direct: { type: 'Workflow' }, descendant: { type: 'Http' } },
      nodesMetadata: {
        direct: { graphId: 'agent', parentNodeId: 'agent' },
        mcp: { graphId: 'agent', parentNodeId: 'agent', subgraphType: SUBGRAPH_TYPES.MCP_CLIENT },
        descendant: { graphId: 'named-tool', parentNodeId: 'agent' },
      },
    };
    for (const [id, toolKind] of [
      ['direct', 'subWorkflow'],
      ['mcp', 'mcp'],
    ] as const) {
      const actual = getWorkflowNodePresentationContext({ id, type: 'OPERATION_NODE' }, context);
      expect(getNodePresentation('OPERATION_NODE', true, actual)).toMatchObject({
        family: 'tool',
        toolKind,
        size: { width: 232, height: 56 },
      });
    }
    const nested = getWorkflowNodePresentationContext({ id: 'descendant', type: 'OPERATION_NODE' }, context);
    expect(getNodePresentation('OPERATION_NODE', true, nested)).toMatchObject({ size: { width: 232, height: 74 } });
  });

  it('reserves the canonical small-tool status badge clearance when actual tool run data appears', () => {
    const node: WorkflowNode = { id: 'mcp', type: 'OPERATION_NODE' };
    const actual = getWorkflowNodePresentationContext(node, {
      nodesMetadata: { mcp: { graphId: 'agent', subgraphType: SUBGRAPH_TYPES.MCP_CLIENT, toolRunData: { status: 'Succeeded' } } },
    });
    expect(getNodePresentation(node.type, true, actual).size).toEqual({ width: 232, height: 66 });
  });

  it('keeps one real named tool row and distinct ordinary inner operations from actual Agent deserialization', async () => {
    const sourceAgent = agentMcpWorkflowDefinitionInput.actions.WorkflowAgent;
    const parsed = Deserialize(
      {
        ...agentMcpWorkflowDefinitionInput,
        actions: {
          ...agentMcpWorkflowDefinitionInput.actions,
          WorkflowAgent: {
            ...sourceAgent,
            tools: {
              ...sourceAgent.tools,
              NamedTool: {
                type: 'AgentCondition',
                actions: {
                  CallWorkflow: { type: 'Workflow', inputs: { host: { workflow: { id: 'real-workflow' } } }, runAfter: {} },
                  InnerCompose: { type: 'Compose', inputs: 'real-result', runAfter: { CallWorkflow: ['SUCCEEDED'] } },
                },
              },
            },
          },
        },
      },
      null
    );
    expect(parsed.nodesMetadata.CallWorkflow).toMatchObject({ graphId: 'NamedTool', parentNodeId: 'WorkflowAgent' });
    const context = { operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
    const layout = await exportForTesting.elkLayout(exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, true, context));
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    const tool = nodes.find(({ id }) => id === 'NamedTool-#subgraph')!;
    expect(tool.data.presentation).toMatchObject({ family: 'tool', toolKind: 'subWorkflow', size: { width: 232, height: 56 } });
    for (const id of ['CallWorkflow', 'InnerCompose']) {
      const bodyAction = nodes.find((node) => node.id === id)!;
      expect(bodyAction.parentId).toBe('NamedTool');
      expect(bodyAction.data.presentation).toMatchObject({ shared: true, size: { width: 232, height: 74 } });
      expect(bodyAction.data.presentation).not.toHaveProperty('toolKind');
    }
    expect(
      (nodes.find(({ id }) => id === 'WorkflowAgent')!.data.toolsPanel as { items: { id: string }[] }).items.map(({ id }) => id)
    ).toEqual(['McpFileServer', 'NamedTool']);
  });

  it('reserves the real canonical port-group overhang for a wide Switch without growing its compact card', () => {
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, { operationType: 'Switch', caseCount: 20 }).size).toEqual({
      width: 424,
      height: 74,
    });
  });

  it('uses actual definitions for nested family layout and retains accepted presentation on XYFlow nodes', async () => {
    const graph: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'renamed',
          type: 'GRAPH_NODE',
          children: [
            { id: 'renamed-#scope', type: 'SCOPE_CARD_NODE', width: 200, height: 40 },
            { id: 'child', type: 'OPERATION_NODE', width: 200, height: 40 },
          ],
          edges: [{ id: 'body', source: 'renamed-#scope', target: 'child', type: 'HEADING_EDGE' }],
        },
      ],
    };
    const context = { operations: { renamed: { type: 'Foreach' } }, nodesMetadata: {} };
    const elkGraph = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, context);
    expect(elkGraph.children?.[0].children?.[0]).toMatchObject({ width: 160, height: 74 });
    const layout = await exportForTesting.elkLayout(elkGraph);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    expect(nodes.find(({ id }) => id === 'renamed-#scope')?.data.presentation).toMatchObject({
      shared: true,
      family: 'loop',
      size: { width: 160, height: 74 },
    });
    expect(nodes.find(({ id }) => id === 'renamed')?.width).toBeGreaterThan(232);
    expect(graph.children?.[0].children?.[0].width).toBe(200);
  });

  it('preserves actual branch edge identities while mapping named ports in definition order', async () => {
    const graph: WorkflowNode = {
      id: 'root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'renamed',
          type: 'GRAPH_NODE',
          children: [
            { id: 'renamed-#scope', type: 'SCOPE_CARD_NODE' },
            { id: 'actual-true', type: 'SUBGRAPH_NODE', children: [{ id: 'actual-true-#subgraph', type: 'SUBGRAPH_CARD_NODE' }] },
            { id: 'actual-false', type: 'SUBGRAPH_NODE', children: [{ id: 'actual-false-#subgraph', type: 'SUBGRAPH_CARD_NODE' }] },
          ],
          edges: [
            { id: 'true-edge', source: 'renamed-#scope', target: 'actual-true', type: 'ONLY_EDGE' },
            { id: 'false-edge', source: 'renamed-#scope', target: 'actual-false', type: 'ONLY_EDGE' },
          ],
        },
      ],
    };
    const context = {
      operations: { renamed: { type: 'If' } },
      nodesMetadata: {
        'actual-true': { graphId: 'renamed', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE },
        'actual-false': { graphId: 'renamed', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE },
      },
    };
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, context);
    expect(converted.children?.[0].children?.[0].ports).toHaveLength(2);
    const layout = await exportForTesting.elkLayout(converted);
    const [nodes, edges] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    expect(nodes.find(({ id }) => id === 'renamed-#scope')?.data.branchPorts).toEqual([
      { id: 'actual-true', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE },
      { id: 'actual-false', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE },
    ]);
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'true-edge', source: 'renamed-#scope', target: 'actual-true', sourceHandle: 'actual-true' }),
        expect.objectContaining({ id: 'false-edge', source: 'renamed-#scope', target: 'actual-false', sourceHandle: 'actual-false' }),
      ])
    );
    expect(edges.every((edge) => edge.data?.presentation)).toBe(true);
  });

  it('reserves an empty loop body frame rather than overlapping the header with its minimum body', async () => {
    const graph: WorkflowNode = {
      id: 'empty-loop',
      type: 'GRAPH_NODE',
      children: [{ id: 'empty-loop-#scope', type: 'SCOPE_CARD_NODE' }],
    };
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, {
      operations: { 'empty-loop': { type: 'Foreach' } },
    });
    const layout = await exportForTesting.elkLayout(converted);
    expect(layout.width).toBeGreaterThanOrEqual(232);
    expect(layout.height).toBeGreaterThanOrEqual(220);
  });

  it('packs real Agent tool graphs vertically without leaking layout-only identities or duplicating MCP editor nodes', async () => {
    const fixture = expectedAgentMcpWorkflowDefinitionOutput;
    const graph = structuredClone(fixture.graph) as WorkflowNode;
    const agent = graph.children![1];
    agent.children!.splice(2, 0, {
      id: 'real-multi-action-tool',
      type: 'SUBGRAPH_NODE',
      children: [
        { id: 'real-multi-action-tool-#subgraph', type: 'SUBGRAPH_CARD_NODE' },
        { id: 'first-action', type: 'OPERATION_NODE' },
        { id: 'second-action', type: 'OPERATION_NODE' },
      ],
      edges: [
        { id: 'tool-body', source: 'real-multi-action-tool-#subgraph', target: 'first-action', type: 'ONLY_EDGE' },
        { id: 'tool-sequence', source: 'first-action', target: 'second-action', type: 'BUTTON_EDGE' },
      ],
    });
    agent.edges!.splice(1, 0, {
      id: 'real-tool-association',
      source: 'WorkflowAgent-#scope',
      target: 'real-multi-action-tool',
      type: 'ONLY_EDGE',
    });
    const baseline = structuredClone(graph);
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, {
      operations: fixture.actionData,
      nodesMetadata: {
        ...fixture.nodesMetadata,
        'real-multi-action-tool': { graphId: 'WorkflowAgent', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION },
      },
    });
    const [nodes, edges] = exportForTesting.convertElkGraphToReactFlow(await exportForTesting.elkLayout(converted), true);
    const mcp = nodes.find(({ id }) => id === 'McpFileServer')!;
    const nested = nodes.find(({ id }) => id === 'real-multi-action-tool')!;
    const add = nodes.find(({ id }) => id === 'WorkflowAgent-addCase')!;
    const panel = nodes.find(({ id }) => id === 'WorkflowAgent')!.data.toolsPanel as {
      x: number;
      y: number;
      width: number;
      height: number;
      items: { id: string }[];
    };
    const header = nodes.find(({ id }) => id === 'WorkflowAgent-#scope')!;
    expect(header.width).toBe(panel.width);
    expect(header.height).toBe(nodes.find(({ id }) => id === 'WorkflowAgent')!.height);
    expect(header.position.x).toBe(panel.x);
    expect(header.data.toolsPanel).toMatchObject({ width: panel.width, height: panel.height });
    expect(header.data.toolsPanel).toMatchObject({ bottomPadding: 0 });
    expect(header.data.presentation).toMatchObject({ size: { width: header.width, height: header.height } });
    expect(nodes.filter(({ id }) => id === mcp.id)).toHaveLength(1);
    expect(mcp.parentId).toBe('WorkflowAgent');
    expect(nested.parentId).toBe('WorkflowAgent');
    expect(nodes.find(({ id }) => id === 'first-action')!.parentId).toBe(nested.id);
    expect(nodes.find(({ id }) => id === 'second-action')!.parentId).toBe(nested.id);
    expect(nested.position.y).toBeGreaterThanOrEqual(mcp.position.y + mcp.height! + 12);
    expect(add.position.y).toBeGreaterThanOrEqual(nested.position.y + nested.height! + 12);
    expect(panel.y).toBe(181);
    for (const tool of [mcp, nested, add]) {
      expect(tool.position.x).toBeGreaterThanOrEqual(panel.x + 16);
      const height = tool.height ?? (tool.data.size as { height: number }).height;
      expect(tool.position.y + height).toBeLessThanOrEqual(panel.y + panel.height - 16);
    }
    expect(panel.items.map(({ id }) => id)).toEqual(['McpFileServer', 'real-multi-action-tool']);
    expect(edges.find(({ id }) => id === 'real-tool-association')).toMatchObject({
      source: 'WorkflowAgent-#scope',
      target: nested.id,
      hidden: true,
    });
    expect(edges.find(({ id }) => id === 'tool-sequence')?.hidden).not.toBe(true);
    expect(edges.find(({ id }) => id === 'WorkflowAgent-#scope-WorkflowAgent-addCase')?.hidden).not.toBe(true);
    expect(nodes.some(({ id }) => id.includes('::tools'))).toBe(false);
    expect(edges.some(({ id }) => id.includes('::layout') || id.includes('::tools-layout'))).toBe(false);
    expect(graph).toEqual(baseline);
  });

  it('keeps the canonical collapsed Agent panel/count while the real tool nodes are absent from layout', async () => {
    const fixture = expectedAgentMcpWorkflowDefinitionOutput;
    const graph = structuredClone(fixture.graph) as WorkflowNode;
    const agent = graph.children![1];
    agent.children = agent.children!.filter((child) => child.type === 'SCOPE_CARD_NODE');
    agent.edges = [];
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, {
      operations: fixture.actionData,
      nodesMetadata: fixture.nodesMetadata,
    });
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(await exportForTesting.elkLayout(converted), true);
    const container = nodes.find(({ id }) => id === 'WorkflowAgent')!;
    const header = nodes.find(({ id }) => id === 'WorkflowAgent-#scope')!;
    expect(header.data.toolsPanel).toMatchObject({
      height: 54,
      collapsed: true,
      items: [{ id: 'McpFileServer' }],
      bottomPadding: 0,
    });
    expect(header.height).toBe(181 + 54);
    expect(container.height).toBe(header.height);
    expect(nodes.some(({ id }) => id === 'McpFileServer')).toBe(false);
  });

  it.each([false, true])('excludes Handoff-only tools but retains mixed-action tools when collapsed=%s', async (collapsed) => {
    const sourceAgent = agentMcpWorkflowDefinitionInput.actions.WorkflowAgent;
    const parsed = Deserialize(
      {
        ...agentMcpWorkflowDefinitionInput,
        actions: {
          ...agentMcpWorkflowDefinitionInput.actions,
          WorkflowAgent: {
            ...sourceAgent,
            tools: {
              ...sourceAgent.tools,
              HandoffOnly: {
                type: 'AgentCondition',
                actions: { Transfer: { type: Constants.NODE.TYPE.HANDOFF, inputs: { name: 'other-agent' }, runAfter: {} } },
              },
              MixedTool: {
                type: 'AgentCondition',
                actions: {
                  TransferAndContinue: { type: Constants.NODE.TYPE.HANDOFF, inputs: { name: 'other-agent' }, runAfter: {} },
                  Continue: { type: 'Compose', inputs: 'real-result', runAfter: { TransferAndContinue: ['Succeeded'] } },
                },
              },
            },
          },
        },
      },
      null
    );
    const store = configureStore({
      reducer: () => ({
        workflow: {
          ...initialWorkflowState,
          graph: parsed.graph,
          operations: parsed.actionData,
          nodesMetadata: parsed.nodesMetadata,
          collapsedGraphIds: collapsed ? { WorkflowAgent: true } : {},
        },
        operations: {},
      }),
    });
    const { result } = renderHook(useRootWorkflowGraphForLayout, {
      wrapper: ({ children }) => createElement(Provider, { store, children }),
    });
    const context = { operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
    const elkGraph = exportForTesting.convertWorkflowGraphToElkGraph(result.current!, true, context);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(await exportForTesting.elkLayout(elkGraph), true);
    const panel = nodes.find(({ id }) => id === 'WorkflowAgent-#scope')!.data.toolsPanel as {
      collapsed: boolean;
      items: { id: string }[];
    };
    expect(panel.collapsed).toBe(collapsed);
    expect(panel.items.map(({ id }) => id)).toEqual(['McpFileServer', 'MixedTool']);
    expect(nodes.some(({ id }) => id === 'HandoffOnly' || id === 'Transfer')).toBe(false);
    expect(nodes.some(({ id }) => id === 'MixedTool')).toBe(!collapsed);
  });

  it.each([
    ['root', false],
    ['root', true],
    ['Scope', false],
    ['Scope', true],
    ['Foreach', false],
    ['Foreach', true],
  ] as const)('keeps represented Handoff tool counts at placement=%s collapsed=%s', async (placement, collapsed) => {
    const sourceAgent = agentMcpWorkflowDefinitionInput.actions.WorkflowAgent;
    const actualAgent = {
      ...sourceAgent,
      tools: {
        ...sourceAgent.tools,
        HandoffOnly: {
          type: 'AgentCondition',
          actions: {
            Transfer: { type: Constants.NODE.TYPE.HANDOFF, inputs: { name: 'OtherAgent' }, runAfter: {} },
          },
        },
      },
    };
    const nested = placement !== 'root';
    const actualActions = nested
      ? {
          Enclosing: {
            type: placement,
            ...(placement === 'Foreach' ? { foreach: '@createArray(1)' } : {}),
            actions: { WorkflowAgent: actualAgent },
            runAfter: {},
          },
        }
      : { WorkflowAgent: actualAgent };
    const parsed = Deserialize(
      {
        ...agentMcpWorkflowDefinitionInput,
        actions: {
          ...actualActions,
          OtherAgent: { ...sourceAgent, tools: {}, runAfter: {} },
        },
      },
      null
    );
    expect(parsed.nodesMetadata.WorkflowAgent.graphId).toBe(nested ? 'Enclosing' : 'root');
    expect(parsed.nodesMetadata.WorkflowAgent.parentNodeId).toBe(nested ? 'Enclosing' : undefined);
    const store = configureStore({
      reducer: () => ({
        workflow: {
          ...initialWorkflowState,
          graph: parsed.graph,
          operations: parsed.actionData,
          nodesMetadata: parsed.nodesMetadata,
          collapsedGraphIds: collapsed ? { WorkflowAgent: true } : {},
        },
        operations: {
          inputParameters: {
            Transfer: {
              parameterGroups: {
                default: {
                  parameters: [{ parameterName: 'name', value: [{ value: 'OtherAgent' }] }],
                },
              },
            },
          },
        },
      }),
    });
    const { result } = renderHook(useRootWorkflowGraphForLayout, {
      wrapper: ({ children }) => createElement(Provider, { store, children }),
    });
    const context = { operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(result.current!, true, context);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(await exportForTesting.elkLayout(converted), true);
    const header = nodes.find(({ id }) => id === 'WorkflowAgent-#scope')!;
    expect(header.data.presentation).toMatchObject({ shared: true, family: 'agent' });
    const panel = header.data.toolsPanel as { collapsed: boolean; items: { id: string }[] };
    expect(panel.collapsed).toBe(collapsed);
    expect(nodes.some(({ id }) => id === 'HandoffOnly')).toBe(nested && !collapsed);
    expect(nodes.some(({ id }) => id === 'Transfer')).toBe(nested && !collapsed);
    expect(panel.items.map(({ id }) => id)).toEqual(nested ? ['McpFileServer', 'HandoffOnly'] : ['McpFileServer']);
  });

  it('matches the unattached connector bounds for a genuinely empty Agent without an add-tool structural node', async () => {
    const graph: WorkflowNode = {
      id: 'empty-agent',
      type: 'GRAPH_NODE',
      children: [{ id: 'empty-agent-#scope', type: 'SCOPE_CARD_NODE' }],
    };
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, {
      operations: { 'empty-agent': { type: 'Agent', tools: {} } },
    });
    const layout = await exportForTesting.elkLayout(converted);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    expect(nodes.find(({ id }) => id === 'empty-agent-#scope')?.height).toBe(187);
    expect(layout.height).toBe(187);
    expect(nodes.find(({ id }) => id === 'empty-agent-#scope')?.data.toolsPanel).toBeUndefined();
  });
});
