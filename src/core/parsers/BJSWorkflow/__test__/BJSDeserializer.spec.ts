import { simpleWorkflowDefinitionInput, expectedSimpleWorkflowDefinitionOutput } from './simpleWorkflowDefinition';
import { Deserialize } from '../BJSDeserializer';

describe('core/parsers/BJSWorkflow/BJSDeserializer', () => {
  beforeAll(() => {
    jest.mock('../../../../../__mocks__/myworker.worker');
  });
  it('should deserialize a basic workflow with no scoped nodes', () => {
    const test = Deserialize(simpleWorkflowDefinitionInput);
    expect(test).toEqual(expectedSimpleWorkflowDefinitionOutput);
  });
});
