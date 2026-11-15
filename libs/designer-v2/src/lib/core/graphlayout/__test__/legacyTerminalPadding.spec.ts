import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { exportForTesting } from '../elklayout';
import { createWorkflowNode } from '../../utils/graph';

vi.mock('@microsoft/designer-ui-v2/metrics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui-v2/metrics')>();
  return {
    ...actual,
    nodeMetrics: {
      ...actual.nodeMetrics,
      // A future shared-only button resize must never change the existing legacy graph gutter.
      actionAdd: { ...actual.nodeMetrics.actionAdd, buttonHeight: 100 },
    },
  };
});

describe('legacy terminal padding isolation from shared metrics', () => {
  it.each([
    { type: WORKFLOW_NODE_TYPES.OPERATION_NODE, legacyPadding: 40, sharedPadding: 108 },
    { type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, legacyPadding: 60, sharedPadding: 128 },
  ])('keeps $type legacy padding at $legacyPadding while shared geometry changes', ({ type, legacyPadding, sharedPadding }) => {
    const graph = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode('child', type)],
    };
    const legacy = exportForTesting.convertWorkflowGraphToElkGraph(graph, false);
    const shared = exportForTesting.convertWorkflowGraphToElkGraph(graph, true);
    expect(legacy.layoutOptions?.['elk.padding']).toBe(`[top=0,left=20,bottom=${legacyPadding},right=20]`);
    expect(shared.layoutOptions?.['elk.padding']).toBe(`[top=0,left=20,bottom=${sharedPadding},right=20]`);
  });
});
