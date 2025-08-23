import { describe, beforeAll, it, expect } from 'vitest';
import { AppStore, setupStore } from '../store';
import { changeCurrentTemplateName, updateKind, updateWorkflowName } from '../templateSlice';
import { manifestSlice, setavailableTemplates, setavailableTemplatesNames } from '../manifestSlice';
import { SkuType, WorkflowKindType } from '../../../../../../../logic-apps-shared/src/utils/src/lib/models/template';

describe('template store reducers', () => {
  let store: AppStore;

  beforeAll(() => {
    store = setupStore({
      template: {
        workflows: {
          default: {
            workflowName: '',
            kind: undefined,
            manifest: undefined,
            workflowDefinition: undefined,
            errors: {
              workflow: undefined,
              kind: undefined,
            },
          },
        },
        templateName: '',
        parameterDefinitions: {},
        connections: {},
        servicesInitialized: false,
        errors: {
          parameters: {},
          connections: undefined,
        },
      },
      manifest: {
        availableTemplateNames: undefined,
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
        },
      },
    });
  });

  it('initial state tests for template store', async () => {
    expect(store.getState().template.workflows['default'].workflowName).toBe('');
    expect(store.getState().manifest.availableTemplateNames).toBe(undefined);
  });

  it('update state call tests for template slice', async () => {
    store.dispatch(changeCurrentTemplateName('templateName1'));
    expect(store.getState().template.templateName).toBe('templateName1');

    store.dispatch(updateWorkflowName({ id: 'default', name: 'workflowName1' }));
    expect(store.getState().template.workflows['default'].workflowName).toBe('workflowName1');

    store.dispatch(updateKind({ id: 'default', kind: 'kind1' }));
    expect(store.getState().template.workflows['default'].kind).toBe('kind1');
  });

  it('update state call tests for manifest slice', async () => {
    store.dispatch(setavailableTemplatesNames(['templateName1']));
    expect(store.getState().manifest.availableTemplateNames).toEqual(['templateName1']);

    const manifest1 = {
      title: 'title',
      description: 'description',
      skus: ['standard' as SkuType],
      kinds: ['kind1' as WorkflowKindType],
      details: {},
      artifacts: [],
      images: {},
      parameters: [],
      connections: {},
    };
    store.dispatch(
      setavailableTemplates({
        workflowName1: manifest1,
        workflowName2: manifest1,
      })
    );
    expect(store.getState().manifest.availableTemplates).toEqual({
      workflowName1: manifest1,
      workflowName2: manifest1,
    });
    expect(store.getState().manifest.availableTemplates?.['workflowName1']).toEqual(manifest1);

    store.dispatch(updateKind({ id: 'default', kind: 'kind1' }));
    expect(store.getState().template.workflows['default'].kind).toBe('kind1');
  });
});
