import { describe, expect, it } from 'vitest';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getSwitchNodeSize, nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import Constants from '../../../common/constants';
import { exportForTesting } from '../elklayout';
import { AGENT_TOOL_CONNECTOR_HEIGHT, createWorkflowNode, getNodePresentation, SHARED_COLLAPSED_CARD_HEIGHT } from '../../utils/graph';
import type { WorkflowNode } from '../../parsers/models/workflowNode';

const expectedTerminalPadding = nodeMetrics.actionAdd.buttonHeight + nodeMetrics.terminalConnectionLength;
const expectedTerminalCenterOffset = nodeMetrics.actionAdd.buttonHeight / 2 + nodeMetrics.terminalConnectionLength;
const getPaddingValue = (padding: string, key: 'bottom' | 'right') => Number(padding.match(new RegExp(`${key}=(\\d+)`))?.[1] ?? Number.NaN);

describe('shared node geometry contracts', () => {
  it('keeps legacy 200x40 node sizing and omits ReactFlow width/height when shared presentation is off', async () => {
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.OPERATION_NODE, false)).toEqual({ shared: false });

    const graph: WorkflowNode = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('action')],
    };
    const result = exportForTesting.convertWorkflowGraphToElkGraph(graph, false);
    expect(result.children?.[0]).toMatchObject({ width: 200, height: 40 });

    const laidOut = await exportForTesting.elkLayout(result);
    const [rfNodes] = exportForTesting.convertElkGraphToReactFlow(laidOut, false);
    const rfAction = rfNodes.find((n) => n.id === 'action')!;
    expect(rfAction.data.presentation).toEqual({ shared: false });
    expect(rfAction).not.toHaveProperty('width');
    expect(rfAction).not.toHaveProperty('height');
  });

  it('derives shared node family sizes from nodeMetrics without hard-coded host dimensions', () => {
    expect(getNodePresentation(WORKFLOW_NODE_TYPES.OPERATION_NODE, true)).toEqual({
      shared: true,
      size: nodeMetrics.cards.action,
    });

    expect(getNodePresentation(WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE, true)).toEqual({
      shared: true,
      family: 'placeholder',
      size: nodeMetrics.cards.trigger,
    });

    expect(getNodePresentation(WORKFLOW_NODE_TYPES.COLLAPSED_NODE, true)).toEqual({
      shared: true,
      family: 'collapsed',
      size: { width: nodeMetrics.cards.action.width, height: SHARED_COLLAPSED_CARD_HEIGHT },
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.SCOPE,
      })
    ).toEqual({
      shared: true,
      family: 'scope',
      size: nodeMetrics.cards.action,
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.IF,
      })
    ).toEqual({
      shared: true,
      family: 'if',
      size: nodeMetrics.cards.condition,
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.FOREACH,
      })
    ).toEqual({
      shared: true,
      family: 'loop',
      size: nodeMetrics.cards.loop,
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.UNTIL,
      })
    ).toEqual({
      shared: true,
      family: 'loop',
      size: nodeMetrics.cards.loop,
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.SWITCH,
        caseCount: 4,
        handleAxis: 'vertical',
      })
    ).toEqual({
      shared: true,
      family: 'switch',
      size: getSwitchNodeSize(4, 'vertical'),
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.SWITCH,
        caseCount: 4,
        handleAxis: 'horizontal',
      })
    ).toEqual({
      shared: true,
      family: 'switch',
      size: getSwitchNodeSize(4, 'horizontal'),
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, {
        operationType: Constants.NODE.TYPE.AGENT,
      })
    ).toEqual({
      shared: true,
      family: 'agent',
      size: {
        width: nodeMetrics.cards.agent.width,
        height: nodeMetrics.cards.agent.headerHeight + nodeMetrics.cards.agent.modelHeight + AGENT_TOOL_CONNECTOR_HEIGHT,
      },
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, true, {
        subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
        hasToolStatus: false,
      })
    ).toEqual({
      shared: true,
      family: 'tool',
      toolKind: 'action',
      size: {
        width: nodeMetrics.cards.tool.width,
        height: nodeMetrics.cards.tool.smallHeight,
      },
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, true, {
        subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
        hasToolStatus: true,
      })
    ).toEqual({
      shared: true,
      family: 'tool',
      toolKind: 'mcp',
      size: {
        width: nodeMetrics.cards.tool.width,
        height: nodeMetrics.cards.tool.smallHeight + nodeMetrics.badge.overhang,
      },
    });

    expect(
      getNodePresentation(WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, true, {
        subgraphType: SUBGRAPH_TYPES.SWITCH_CASE,
      })
    ).toEqual({
      shared: true,
      family: 'branch',
      size: {
        width: nodeMetrics.frame.minWidth,
        height: nodeMetrics.handle.labeledHeight + 16,
      },
    });

    const graph: WorkflowNode = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('add-case', WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
    };
    const result = exportForTesting.convertWorkflowGraphToElkGraph(graph, true, {
      nodesMetadata: { 'add-case': { subgraphType: SUBGRAPH_TYPES.SWITCH_ADD_CASE } } as any,
    });
    expect(result.children?.[0]).toMatchObject({
      width: nodeMetrics.cards.action.width,
      height: nodeMetrics.actionAdd.containerHeight,
    });
  });

  it('stamps frame minimum size and bodyFrame offsets from shared metrics', async () => {
    const scopeGraph: WorkflowNode = {
      id: 'foreach-scope',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('foreach-scope-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE), createWorkflowNode('inside-action')],
    };
    const elkScope = exportForTesting.convertWorkflowGraphToElkGraph(scopeGraph, true, {
      operations: {
        'foreach-scope': { type: Constants.NODE.TYPE.FOREACH },
        'inside-action': { type: 'Compose' },
      } as any,
    });
    expect(elkScope.layoutOptions?.['elk.nodeSize.minimum']).toBe('(232,220)');

    const laidOutDirect = await exportForTesting.elkLayout(elkScope);
    const [scopeNodes] = exportForTesting.convertElkGraphToReactFlow(
      {
        id: 'root',
        width: 400,
        height: 400,
        children: [laidOutDirect],
      },
      true
    );
    const frameNode = scopeNodes.find((n) => n.id === 'foreach-scope')!;
    const expectedHeaderOffset = nodeMetrics.cards.action.height + expectedTerminalPadding;
    expect(frameNode.data.presentation).toEqual({ shared: true, family: 'frame' });
    expect(frameNode.data.bodyFrame).toEqual({
      y: expectedHeaderOffset,
      height: Math.max(0, (frameNode.height ?? 0) - expectedHeaderOffset),
    });
  });

  it('keeps terminal add spacing aligned to 32px controls for both DOWN and RIGHT layout axes', async () => {
    const verticalGraph: WorkflowNode = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('a'), createWorkflowNode('b')],
    };
    const vertical = exportForTesting.convertWorkflowGraphToElkGraph(verticalGraph, true);
    const verticalPadding = vertical.layoutOptions?.['elk.padding'] ?? '';
    expect(verticalPadding).toContain(`bottom=${expectedTerminalPadding}`);
    expect(verticalPadding).toContain('right=20');
    expect(getPaddingValue(verticalPadding, 'bottom') - nodeMetrics.actionAdd.buttonHeight / 2).toBe(expectedTerminalCenterOffset);

    const horizontalGraph: WorkflowNode = {
      id: 'tool-branch',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('tool-a'), createWorkflowNode('tool-b')],
    };
    const horizontal = exportForTesting.convertWorkflowGraphToElkGraph(horizontalGraph, true, {
      nodesMetadata: { 'tool-branch': { subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION } } as any,
    });
    const horizontalPadding = horizontal.layoutOptions?.['elk.padding'] ?? '';
    expect(horizontalPadding).toContain(`right=${expectedTerminalPadding}`);
    expect(horizontalPadding).toContain('bottom=20');
    expect(getPaddingValue(horizontalPadding, 'right') - nodeMetrics.actionAdd.buttonHeight / 2).toBe(expectedTerminalCenterOffset);

    const laidOut = await exportForTesting.elkLayout(horizontal);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(laidOut, true);
    expect(nodes.map((node) => node.data.handleAxis)).toEqual(['horizontal', 'horizontal']);
    expect(nodes.every((node) => node.data.presentation?.shared === true && node.width === 232 && node.height === 74)).toBe(true);
  });
});
