import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { describe, expect, it, vi } from 'vitest';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import { createWorkflowEdge, createWorkflowNode } from '../../../utils/graph';
import { canWrapSelectedNodes } from '../../../utils/multiselect';
import { wrapSelectedNodesInScope } from '../wrapInScope';

describe('wrapSelectedNodesInScope', () => {
  it('rejects a direct Group command when the host enters monitoring', async () => {
    const initial = getMockedInitialRootState();
    const nodeIds = ['Compose', 'Response'];
    const workflow = {
      ...initial.workflow,
      graph: {
        id: 'root',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: nodeIds.map((id) => createWorkflowNode(id)),
        edges: [createWorkflowEdge('Compose', 'Response')],
      },
      nodesMetadata: { Compose: { graphId: 'root' }, Response: { graphId: 'root' } },
    };
    expect(canWrapSelectedNodes(workflow, nodeIds)).toBe(true);
    const designerOptions = { ...initial.designerOptions, isMonitoringView: true, readOnly: false };
    const dispatch = vi.fn();

    await wrapSelectedNodesInScope({ nodeIds, scopeType: 'Scope' })(dispatch, () => ({ ...initial, workflow, designerOptions }), undefined);

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      wrapSelectedNodesInScope.pending.type,
      wrapSelectedNodesInScope.fulfilled.type,
    ]);
  });
});
