import { Deserialize } from '../BJSDeserializer';
import { scopedWorkflowDefinitionInput, expectedScopedWorkflowDefinitionOutput } from './scopedWorkflowDefinition';
import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';
import { agentMcpWorkflowDefinitionInput, expectedAgentMcpWorkflowDefinitionOutput } from './agentMcpWorkflowDefinition';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import {
  expectedSwitchWorkflowDefinitionOutput,
  expectedSwitchWorkflowDefinitionOutputWithoutAddCase,
  switchWorkflowDefinitionInput,
} from './switchWorkflowDefinition';

describe('core/parsers/BJSWorkflow/BJSDeserializer', () => {
  it('should deserialize a basic workflow with no scoped nodes', () => {
    const test = Deserialize(simpleWorkflowDefinitionInput, null);
    expect(test).toEqual(expectedSimpleWorkflowDefinitionOutput);
  });

  it('should deserialize a basic workflow with scoped nodes', () => {
    const test = Deserialize(scopedWorkflowDefinitionInput, null);
    expect(test).toEqual(expectedScopedWorkflowDefinitionOutput);
  });

  it('should deserialize a workflow with switch nodes and add nodes for add case', () => {
    const test = Deserialize(switchWorkflowDefinitionInput, null, true);
    expect(test).toEqual(expectedSwitchWorkflowDefinitionOutput);
  });
  it('should deserialize a workflow with switch nodes and not add nodes for add case', () => {
    const test = Deserialize(switchWorkflowDefinitionInput, null, false);
    expect(test).toEqual(expectedSwitchWorkflowDefinitionOutputWithoutAddCase);
  });

  it('should be able to deserialize agent workflow with MCP client operations', () => {
    const test = Deserialize(agentMcpWorkflowDefinitionInput, null);
    expect(test).toEqual(expectedAgentMcpWorkflowDefinitionOutput);
  });

  it('should not throw when a run instance is provided and an action is missing its type', () => {
    // Regression: an action whose deserialized shape lacks `type` previously caused
    // `allActions[key]?.type.toLowerCase()` to throw "Cannot read properties of undefined",
    // which the portal error boundary surfaces as the generic "renderComponentIntoRoot" error
    // and blanks the Run History / Designer / Code view.
    const definitionWithTypelessAction: any = {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
          inputs: {},
        },
      },
      actions: {
        Broken_Action: {
          inputs: {},
          runAfter: {},
        },
      },
    };
    const runInstance: any = {
      id: '/workflows/test/runs/run1',
      name: 'run1',
      type: 'workflows/runs',
      properties: {
        status: 'Succeeded',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:01Z',
        trigger: { name: 'manual', status: 'Succeeded', startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:00:00Z' },
        actions: {
          Broken_Action: { status: 'Succeeded', startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-01T00:00:01Z' },
        },
      },
    };

    expect(() => Deserialize(definitionWithTypelessAction, runInstance)).not.toThrow();
    const result = Deserialize(definitionWithTypelessAction, runInstance);
    expect(result.actionData['Broken_Action']).toBeDefined();
    expect(result.nodesMetadata['Broken_Action']).toBeDefined();
  });
});
