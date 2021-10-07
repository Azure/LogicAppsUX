import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';
import { Deserialize } from '../BJSDeserializer';

describe('core/parsers/BJSWorkflow/BJSDeserializer', () => {
  it('should deserialize a basic workflow with no scoped nodes', () => {
    const test = Deserialize(simpleWorkflowDefinitionInput);
    expect(test).toEqual(expectedSimpleWorkflowDefinitionOutput);
  });
});
