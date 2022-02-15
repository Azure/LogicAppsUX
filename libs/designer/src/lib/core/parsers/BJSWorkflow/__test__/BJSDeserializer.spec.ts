import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';
import { Deserialize } from '../BJSDeserializer';

import { scopedWorkflowDefinitionInput, expectedScopedWorkflowDefinitionOutput } from './scopedWorkflowDefinition';
describe('core/parsers/BJSWorkflow/BJSDeserializer', () => {
  it('should deserialize a basic workflow with no scoped nodes', () => {
    const test = Deserialize(simpleWorkflowDefinitionInput);
    expect(test).toEqual(expectedSimpleWorkflowDefinitionOutput);
  });

  it('should deserialize a basic workflow with scoped nodes', () => {
    const test = Deserialize(scopedWorkflowDefinitionInput);
    expect(test).toEqual(expectedScopedWorkflowDefinitionOutput);
  });
});
