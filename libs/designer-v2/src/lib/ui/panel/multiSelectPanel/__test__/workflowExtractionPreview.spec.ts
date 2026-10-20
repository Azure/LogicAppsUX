import { composeOperation, requestOperation, responseOperation, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import * as Shared from '@microsoft/logic-apps-shared';
import { describe, expect, it, vi } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import type { WorkflowExtractionPlan } from '../../../../common/models/workflowExtraction';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { getWorkflowExtractionPreview } from '../workflowExtractionPreview';
import { store } from '../../../../core/store';

const planFor = (actions: LogicAppsV2.Actions): WorkflowExtractionPlan => {
  const workflow: Workflow = {
    kind: 'Stateful',
    definition: {
      triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
      actions: {
        ...actions,
        Response: { type: 'Response', inputs: { statusCode: 200 }, runAfter: { Container: ['Succeeded'] } },
      },
    },
  };
  return {
    source: workflow,
    child: workflow,
    childName: 'Child',
    invocationId: 'Invoke_child',
    selectedIds: ['Container'],
    inputs: [],
    outputs: [],
  };
};

describe('getWorkflowExtractionPreview', () => {
  it('renders a complete Condition with its two expanded branches, without duplicating selected children at the top level', async () => {
    const workflow: Workflow = {
      kind: 'Stateful',
      definition: {
        triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
        actions: {
          Condition: {
            type: 'If',
            expression: '@true',
            actions: { Then: { type: 'Compose', inputs: 'then', runAfter: {} } },
            else: { actions: { Otherwise: { type: 'Compose', inputs: 'else', runAfter: {} } } },
            runAfter: {},
          },
        },
      },
    };
    const plan = buildWorkflowExtractionPlan(workflow, ['Otherwise', 'Then', 'Condition'], 'Child', (_name, body, runAfter) => ({
      type: 'Workflow',
      inputs: { body },
      runAfter,
    }));
    const before = structuredClone(plan);
    const preview = await getWorkflowExtractionPreview(plan);
    expect(plan.selectedIds).toEqual(['Condition']);
    expect(preview.nodes.filter(({ parentId }) => !parentId).map(({ id }) => id)).toEqual(['Request', 'Condition', 'Response']);
    expect(preview.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Condition', kind: 'container' }),
        expect.objectContaining({ id: 'Condition-#scope', kind: 'scope', parentId: 'Condition', label: 'Condition' }),
        expect.objectContaining({ id: 'Condition-actions-#subgraph', kind: 'branch', branchType: 'true', label: 'True' }),
        expect.objectContaining({ id: 'Condition-elseActions-#subgraph', kind: 'branch', branchType: 'false', label: 'False' }),
        expect.objectContaining({ id: 'Then', parentId: 'Condition-actions' }),
        expect.objectContaining({ id: 'Otherwise', parentId: 'Condition-elseActions' }),
      ])
    );
    expect(preview.edges.map(({ source, target }) => [source, target])).toEqual(
      expect.arrayContaining([
        ['Request', 'Condition'],
        ['Condition', 'Response'],
        ['Condition-#scope', 'Condition-actions'],
        ['Condition-#scope', 'Condition-elseActions'],
        ['Condition-actions-#subgraph', 'Then'],
        ['Condition-elseActions-#subgraph', 'Otherwise'],
      ])
    );
    const ids = preview.nodes.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of preview.nodes) {
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
      if (node.parentId) {
        const parent = preview.nodes.find(({ id }) => id === node.parentId)!;
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(0);
        expect(node.position.x + node.width!).toBeLessThanOrEqual(parent.width! + 1);
        expect(node.position.y + node.height!).toBeLessThanOrEqual(parent.height! + 1);
      }
    }
    expect(plan.child.definition.actions.Condition).toEqual(workflow.definition.actions.Condition);
    expect(plan.child.definition.actions.Then).toBeUndefined();
    expect(plan.child.definition.actions.Otherwise).toBeUndefined();
    expect(plan).toEqual(before);
  });

  it('uses generated IDs, ordered actions, and actual child dependencies without including source-only actions', async () => {
    const workflow: Workflow = {
      kind: 'Stateful',
      definition: {
        triggers: { Original_request: { type: 'Request', kind: 'Http', inputs: {} } },
        actions: {
          Before: { type: 'Compose', inputs: 'before', runAfter: {} },
          Request: { type: 'Compose', inputs: 'first', runAfter: { Before: ['Succeeded'] } },
          Response: { type: 'Compose', inputs: 'second', runAfter: { Request: ['Succeeded'] } },
          After: { type: 'Compose', inputs: 'after', runAfter: { Response: ['Succeeded'] } },
        },
      },
    };
    const plan = buildWorkflowExtractionPlan(workflow, ['Response', 'Request'], 'Child', (name, body, runAfter) => ({
      type: 'Workflow',
      inputs: { host: { workflow: { id: name } }, body },
      runAfter,
    }));
    const before = JSON.stringify(plan);
    const preview = await getWorkflowExtractionPreview(plan);

    expect(preview.nodes.map(({ id }) => id)).toEqual(['Request_2', 'Request', 'Response', 'Response_2']);
    expect(preview.nodes.map(({ label }) => label)).toEqual(['Request 2', 'Request', 'Response', 'Response 2']);
    expect(preview.nodes.map(({ position }) => position.y)).toEqual(
      [...preview.nodes.map(({ position }) => position.y)].sort((a, b) => a - b)
    );
    expect(preview.edges.map(({ source, target }) => [source, target])).toEqual([
      ['Request_2', 'Request'],
      ['Request', 'Response'],
      ['Response', 'Response_2'],
    ]);
    expect(new Set(preview.edges.map(({ id }) => id)).size).toBe(3);
    expect(preview.nodes[0]).toMatchObject({
      iconUri: requestOperation.properties.iconUri,
      brandColor: requestOperation.properties.brandColor,
    });
    expect(preview.nodes[1]).toMatchObject({
      iconUri: composeOperation.properties.iconUri,
      brandColor: composeOperation.properties.brandColor,
    });
    expect(preview.nodes[3]).toMatchObject({
      iconUri: responseOperation.properties.iconUri,
      brandColor: responseOperation.properties.brandColor,
    });
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('uses captured operation and connector visuals without applying source trigger metadata to the generated Request', async () => {
    const workflow: Workflow = {
      kind: 'Stateful',
      connectionReferences: {},
      definition: {
        triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
        actions: {
          Call_connector: { type: 'ApiConnection', inputs: {}, runAfter: {} },
          Filter: { type: 'Query', inputs: {}, runAfter: { Call_connector: ['Succeeded'] } },
          Response: { type: 'Response', kind: 'Http', inputs: {}, runAfter: { Filter: ['Succeeded'] } },
        },
      },
    };
    const plan: WorkflowExtractionPlan = {
      source: workflow,
      child: workflow,
      childName: 'Child',
      invocationId: 'Invoke_child',
      selectedIds: ['Call_connector', 'Filter'],
      inputs: [],
      outputs: [],
    };
    const visuals = {
      Call_connector: { iconUri: 'connector.svg', brandColor: '#123456' },
      Filter: { iconUri: 'filter.svg', brandColor: '#654321' },
      Request: { iconUri: 'source-recurrence.svg', brandColor: '#111111' },
      Response: { iconUri: 'source-action.svg', brandColor: '#222222' },
    };
    const before = structuredClone({ plan, visuals });
    const preview = await getWorkflowExtractionPreview(plan, visuals);

    expect(preview.nodes.map(({ id }) => id)).toEqual(['Request', 'Call_connector', 'Filter', 'Response']);
    expect(preview.nodes[1]).toMatchObject(visuals.Call_connector);
    expect(preview.nodes[2]).toMatchObject(visuals.Filter);
    expect(preview.nodes[0]).toMatchObject({
      iconUri: requestOperation.properties.iconUri,
      brandColor: requestOperation.properties.brandColor,
    });
    expect(preview.nodes[3]).toMatchObject({
      iconUri: responseOperation.properties.iconUri,
      brandColor: responseOperation.properties.brandColor,
    });
    expect((await getWorkflowExtractionPreview(plan)).nodes[1]).toMatchObject({ iconUri: undefined, brandColor: undefined });
    expect({ plan, visuals }).toEqual(before);
  });

  it.each([
    {
      type: 'Scope',
      actions: {
        Nested_condition: {
          type: 'If',
          expression: '@true',
          actions: { Nested_then: { type: 'Compose', inputs: 'then', runAfter: {} } },
          else: { actions: {} },
          runAfter: {},
        },
      },
      expected: ['Nested_condition', 'Nested_condition-actions', 'Nested_condition-elseActions', 'Nested_then'],
    },
    {
      type: 'Switch',
      expression: 'value',
      cases: {
        Named_case: { case: 'value', actions: { Case_action: { type: 'Compose', inputs: 'case', runAfter: {} } } },
        Empty_case: { case: 'empty', actions: {} },
      },
      default: { actions: { Default_action: { type: 'Compose', inputs: 'default', runAfter: {} } } },
      expected: ['Named_case', 'Empty_case', 'Case_action', 'Container-defaultCase', 'Default_action'],
    },
    {
      type: 'Foreach',
      foreach: '@createArray(1)',
      actions: { Loop_action: { type: 'Compose', inputs: 'each', runAfter: {} } },
      expected: ['Loop_action'],
    },
    {
      type: 'Until',
      expression: '@true',
      limit: { count: 2, timeout: 'PT1H' },
      actions: { Loop_action: { type: 'Compose', inputs: 'until', runAfter: {} } },
      expected: ['Container-#subgraph', 'Loop_action', 'Container-#footer'],
    },
    {
      type: 'Agent',
      tools: { Named_tool: { actions: { Tool_action: { type: 'Compose', inputs: 'tool', runAfter: {} } } } },
      expected: ['Named_tool', 'Tool_action'],
    },
  ])('faithfully lays out $type graphs, including empty and virtual branches, without add controls', async ({ expected, ...operation }) => {
    const plan = planFor({ Container: { ...operation, runAfter: {} } });
    const before = structuredClone(plan);
    const preview = await getWorkflowExtractionPreview(plan, { Loop_action: { iconUri: 'loop-action.svg', brandColor: '#123456' } });
    const ids = preview.nodes.map(({ id }) => id);
    expect(ids).toEqual(expect.arrayContaining(['Request', 'Container', 'Response', ...expected]));
    expect(ids.some((id) => id.endsWith('-addCase') || id.endsWith('-addCase-#subgraph'))).toBe(false);
    expect(preview.nodes.filter(({ id }) => expected.includes(id)).every(({ parentId }) => !!parentId)).toBe(true);
    expect(preview.nodes.find(({ id }) => id === 'Container')).toMatchObject({ kind: 'container' });
    for (const edge of preview.edges) {
      expect(ids).toContain(edge.source);
      expect(ids).toContain(edge.target);
    }
    if (operation.type === 'Switch') {
      expect(preview.nodes.find(({ id }) => id === 'Named_case-#subgraph')).toMatchObject({ label: 'Named case', branchType: 'case' });
      expect(preview.nodes.find(({ id }) => id === 'Container-defaultCase-#subgraph')).toMatchObject({
        label: 'Default',
        branchType: 'default',
      });
    }
    if (operation.type === 'Until') {
      expect(preview.nodes.find(({ id }) => id === 'Container-#subgraph')).toMatchObject({ label: 'Do', branchType: 'do' });
    }
    if (operation.type === 'Agent') {
      expect(preview.nodes.find(({ id }) => id === 'Named_tool-#subgraph')).toMatchObject({ label: 'Named tool', branchType: 'tool' });
    }
    if (operation.type === 'Foreach' || operation.type === 'Until') {
      expect(preview.nodes.find(({ id }) => id === 'Loop_action')).toMatchObject({ iconUri: 'loop-action.svg', brandColor: '#123456' });
    }
    expect(plan).toEqual(before);
  });

  it('preserves parallel runAfter branches and joins rather than positioning a flat sequence', async () => {
    const preview = await getWorkflowExtractionPreview(
      planFor({
        Container: {
          type: 'Scope',
          actions: {
            First: { type: 'Compose', inputs: 'first', runAfter: {} },
            Second: { type: 'Compose', inputs: 'second', runAfter: {} },
            Join: { type: 'Compose', inputs: 'join', runAfter: { First: ['Succeeded'], Second: ['Failed'] } },
            Tail: { type: 'Compose', inputs: 'tail', runAfter: { Second: ['Succeeded'] } },
          },
          runAfter: {},
        },
      })
    );
    const byId = Object.fromEntries(preview.nodes.map((node) => [node.id, node]));
    expect(byId.First.parentId).toBe('Container');
    expect(byId.First.position.x).not.toBe(byId.Second.position.x);
    expect(byId.Join.position.y).toBeGreaterThan(byId.First.position.y);
    expect(byId.Join.position.y).toBeGreaterThan(byId.Second.position.y);
    expect(preview.edges.map(({ source, target }) => [source, target])).toEqual(
      expect.arrayContaining([
        ['First', 'Join'],
        ['Second', 'Join'],
        ['Second', 'Tail'],
      ])
    );
  });

  it('does not initialize services or mutate the live singleton while building and laying out a preview', async () => {
    const before = store.getState();
    const initializeManifest = vi.spyOn(Shared, 'InitOperationManifestService');
    const initializeConnections = vi.spyOn(Shared, 'InitConnectionService');
    const initializeWorkflow = vi.spyOn(Shared, 'InitWorkflowService');
    const dispatch = vi.spyOn(store, 'dispatch');
    await getWorkflowExtractionPreview(planFor({ Container: { type: 'Scope', actions: {}, runAfter: {} } }));
    expect(store.getState()).toBe(before);
    expect(dispatch).not.toHaveBeenCalled();
    expect(initializeManifest).not.toHaveBeenCalled();
    expect(initializeConnections).not.toHaveBeenCalled();
    expect(initializeWorkflow).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
