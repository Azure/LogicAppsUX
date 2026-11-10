import { WORKFLOW_PREVIEW_NODE_HEIGHT } from '@microsoft/designer-ui';
import { composeOperation, requestOperation, responseOperation } from '@microsoft/logic-apps-shared';
import { describe, expect, it } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import type { WorkflowExtractionPlan } from '../../../../common/models/workflowExtraction';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { getWorkflowExtractionPreview } from '../workflowExtractionPreview';

describe('getWorkflowExtractionPreview', () => {
  it('uses generated IDs, ordered actions, and actual child dependencies without including source-only actions', () => {
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
    const preview = getWorkflowExtractionPreview(plan);

    expect(preview.nodes.map(({ id }) => id)).toEqual(['Request_2', 'Request', 'Response', 'Response_2']);
    expect(preview.nodes.map(({ label }) => label)).toEqual(['Request 2', 'Request', 'Response', 'Response 2']);
    expect(preview.nodes.map(({ position }) => position)).toEqual(
      [0, 1, 2, 3].map((index) => ({ x: 0, y: index * (WORKFLOW_PREVIEW_NODE_HEIGHT + 40) }))
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

  it('uses captured operation and connector visuals without applying source trigger metadata to the generated Request', () => {
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
    const preview = getWorkflowExtractionPreview(plan, visuals);

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
    expect(getWorkflowExtractionPreview(plan).nodes[1]).toMatchObject({ iconUri: undefined, brandColor: undefined });
    expect({ plan, visuals }).toEqual(before);
  });
});
