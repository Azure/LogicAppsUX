import { Deserialize } from '../BJSDeserializer';
import { scopedWorkflowDefinitionInput, expectedScopedWorkflowDefinitionOutput } from './scopedWorkflowDefinition';
import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';

describe('core/parsers/BJSWorkflow/BJSDeserializer', () => {
  it('should deserialize a basic workflow with no scoped nodes', () => {
    const test = Deserialize(simpleWorkflowDefinitionInput, null);
    expect(test).toEqual(expectedSimpleWorkflowDefinitionOutput);
  });

  it('should deserialize a basic workflow with scoped nodes', () => {
    const test = Deserialize(scopedWorkflowDefinitionInput, null);
    expect(test).toEqual(expectedScopedWorkflowDefinitionOutput);
  });
});
