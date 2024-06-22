import { describe, beforeAll, expect, it } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { TemplatesDesigner } from '../TemplatesDesigner';
import { screen } from '@testing-library/react';

describe('ui/templates/templatesDesigner', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.Manifest;
  let template2Manifest: Template.Manifest;

  beforeAll(() => {
    template1Manifest = {
      title: 'Template 1',
      description: 'Template 1 Description',
      skus: ['standard'],
      kinds: ['stateful'],
      images: {},
      details: {},
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
      ],
      connections: {},
      parameters: [],
    };
    template2Manifest = {
      title: 'Template 2',
      description: 'Template 2 Description',
      skus: ['standard', 'consumption'],
      kinds: ['stateful', 'stateless'],
      images: {},
      details: {},
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
      ],
      connections: {},
      parameters: [],
    };
  });

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: any,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {};
  it('Fetches templates and display the title and description', async () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2'],
        filteredTemplateNames: ['template1', 'template2'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
        },
        filters: {
          connectors: undefined,
          detailFilters: {},
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderWithProviders(<TemplatesDesigner createWorkflowCall={createWorkflowCall} />, { store });

    expect(screen.getByText(/Template 1/i)).toBeDefined();
    expect(screen.getByText(/Template 2/i)).toBeDefined();
  });
});
