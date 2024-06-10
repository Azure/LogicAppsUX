import { describe, beforeAll, it, expect } from 'vitest';
import { AppStore, setupStore } from '../store';
import { changeCurrentTemplateName, updateKind, updateWorkflowName } from '../templateSlice';

describe('template store reducers', () => {
  let store: AppStore;

  beforeAll(() => {
    store = setupStore({
      template: {
        workflowName: '',
        kind: undefined,
        templateName: '',
        manifest: undefined,
        workflowDefinition: undefined,
        parameters: {
          definitions: {},
          validationErrors: {},
        },
        connections: [],
      },
    });
  });

  it('initial state tests for template slice', async () => {
    expect(store.getState().template.workflowName).toBe('');
  });

  it('update state call tests for template slice', async () => {
    store.dispatch(changeCurrentTemplateName('templateName1'));
    expect(store.getState().template.templateName).toBe('templateName1');

    store.dispatch(updateWorkflowName('workflowName1'));
    expect(store.getState().template.workflowName).toBe('workflowName1');

    store.dispatch(updateKind('kind1'));
    expect(store.getState().template.kind).toBe('kind1');
  });
});
