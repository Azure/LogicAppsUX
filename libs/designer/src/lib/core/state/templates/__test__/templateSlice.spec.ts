import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { changeCurrentTemplateName, templateSlice, updateKind, updateWorkflowName } from '../templateSlice';
describe('templates slice reducers', () => {
  it('update state call tests', async () => {
    const initialState = {
      workflowDefinition: undefined,
      manifest: undefined,
      workflowName: undefined,
      kind: undefined,
      parameters: {
        definitions: {},
        validationErrors: {},
      },
      connections: [],
    };

    const state1 = templateSlice.reducer(initialState, changeCurrentTemplateName('templateName'));
    expect(state1.templateName).toEqual('templateName');

    const state2 = templateSlice.reducer(initialState, updateWorkflowName('workflowName'));
    expect(state2.workflowName).toEqual('workflowName');

    const state3 = templateSlice.reducer(initialState, updateKind('kindExample'));
    expect(state3.kind).toEqual('kindExample');
  });
});
