import { describe, it, expect } from 'vitest';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { NodesMetadata } from '../../../../core/state/workflow/workflowInterfaces';
import type { NodeOperation } from '../../../../core/state/operation/operationMetadataSlice';
import { getLoopsCount, getRepetitionName, getScopeRepetitionName } from '../helper';

describe('getLoopsCount', () => {
  it('should return iterationCount when present', () => {
    const action = { iterationCount: 5 } as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(5);
  });

  it('should return iterationCount of 0', () => {
    const action = { iterationCount: 0 } as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(0);
  });

  it('should return foreachItemsCount from inputsLink metadata', () => {
    const action = {
      inputsLink: { metadata: { foreachItemsCount: 10 } },
    } as unknown as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(10);
  });

  it('should return repetitionCount when no iterationCount or foreachItemsCount', () => {
    const action = { repetitionCount: 3 } as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(3);
  });

  it('should prefer iterationCount over foreachItemsCount', () => {
    const action = {
      iterationCount: 7,
      inputsLink: { metadata: { foreachItemsCount: 10 } },
    } as unknown as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(7);
  });

  it('should prefer foreachItemsCount over repetitionCount', () => {
    const action = {
      inputsLink: { metadata: { foreachItemsCount: 4 } },
      repetitionCount: 9,
    } as unknown as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBe(4);
  });

  it('should return undefined when no count properties exist', () => {
    const action = {} as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBeUndefined();
  });

  it('should return undefined for null/undefined action', () => {
    expect(getLoopsCount(undefined as unknown as LogicAppsV2.WorkflowRunAction)).toBeUndefined();
    expect(getLoopsCount(null as unknown as LogicAppsV2.WorkflowRunAction)).toBeUndefined();
  });

  it('should return undefined when inputsLink has no metadata', () => {
    const action = { inputsLink: {} } as unknown as LogicAppsV2.WorkflowRunAction;
    expect(getLoopsCount(action)).toBeUndefined();
  });
});

describe('getRepetitionName', () => {
  it('should return empty string when node has no loop parents', () => {
    const nodesMetadata: NodesMetadata = {
      node1: { graphId: 'root' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    expect(getRepetitionName(0, 'node1', nodesMetadata, operationInfo)).toBe('');
  });

  it('should return zero-padded index for node inside a foreach', () => {
    const nodesMetadata: NodesMetadata = {
      foreach1: { graphId: 'root', runIndex: 2 },
      node1: { graphId: 'foreach1', parentNodeId: 'foreach1' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      foreach1: { type: 'Foreach', connectorId: '', operationId: '' },
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    expect(getRepetitionName(3, 'node1', nodesMetadata, operationInfo)).toBe('000003');
  });

  it('should return zero-padded index for node inside an until loop', () => {
    const nodesMetadata: NodesMetadata = {
      until1: { graphId: 'root', runIndex: 0 },
      node1: { graphId: 'until1', parentNodeId: 'until1' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      until1: { type: 'Until', connectorId: '', operationId: '' },
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    expect(getRepetitionName(5, 'node1', nodesMetadata, operationInfo)).toBe('000005');
  });

  it('should return zero-padded index for node inside an agent', () => {
    const nodesMetadata: NodesMetadata = {
      agent1: { graphId: 'root', runIndex: 1 },
      node1: { graphId: 'agent1', parentNodeId: 'agent1' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      agent1: { type: 'Agent', connectorId: '', operationId: '' },
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    expect(getRepetitionName(7, 'node1', nodesMetadata, operationInfo)).toBe('000007');
  });

  it('should build nested repetition name for doubly-nested loops', () => {
    const nodesMetadata: NodesMetadata = {
      outerLoop: { graphId: 'root', runIndex: 2 },
      innerLoop: { graphId: 'outerLoop', parentNodeId: 'outerLoop', runIndex: 4 },
      node1: { graphId: 'innerLoop', parentNodeId: 'innerLoop' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      outerLoop: { type: 'Foreach', connectorId: '', operationId: '' },
      innerLoop: { type: 'Foreach', connectorId: '', operationId: '' },
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    const result = getRepetitionName(1, 'node1', nodesMetadata, operationInfo);
    expect(result).toBe('000002-000001');
  });

  it('should skip non-loop parents', () => {
    const nodesMetadata: NodesMetadata = {
      scope1: { graphId: 'root' },
      foreach1: { graphId: 'scope1', parentNodeId: 'scope1', runIndex: 3 },
      node1: { graphId: 'foreach1', parentNodeId: 'foreach1' },
    };
    const operationInfo: Record<string, NodeOperation> = {
      scope1: { type: 'Scope', connectorId: '', operationId: '' },
      foreach1: { type: 'Foreach', connectorId: '', operationId: '' },
      node1: { type: 'http', connectorId: '', operationId: '' },
    };
    expect(getRepetitionName(2, 'node1', nodesMetadata, operationInfo)).toBe('000002');
  });
});

describe('getScopeRepetitionName', () => {
  it('should zero-pad the index to 6 digits', () => {
    expect(getScopeRepetitionName(0)).toBe('000000');
    expect(getScopeRepetitionName(1)).toBe('000001');
    expect(getScopeRepetitionName(42)).toBe('000042');
    expect(getScopeRepetitionName(999999)).toBe('999999');
  });

  it('should handle undefined index', () => {
    expect(getScopeRepetitionName(undefined)).toBe('undefined');
  });
});
