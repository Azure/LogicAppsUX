import { Deserialize } from '../BJSDeserializer';
import { scopedWorkflowDefinitionInput, expectedScopedWorkflowDefinitionOutput } from './scopedWorkflowDefinition';
import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';
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
});
