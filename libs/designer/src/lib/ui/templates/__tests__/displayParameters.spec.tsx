import { describe, beforeAll, expect, it } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { DisplayParameters } from '../parameters/displayParameters';
import type { TemplateState } from '../../../core/state/templates/templateSlice';

describe('ui/templates/DisplayParameters', () => {
  let store: AppStore;
  let template1Manifest: Template.Manifest;

  beforeAll(() => {
    template1Manifest = {
      title: 'Template 1',
      description: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      kinds: ['stateful', 'stateless'],
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
        {
          type: 'description',
          file: 'description.md',
        },
      ],
      connections: [],
      parameters: [
        {
          name: 'param1',
          type: 'object',
          description: 'param1 description',
        },
      ],
    };
  });

  it('Renders TemplateCard and loads template state correctly on buttons click', async () => {
    const templateSliceData: TemplateState = {
      templateName: template1Manifest.title,
      manifest: template1Manifest,
      workflowDefinition: {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '',
      },
      parameters: {
        definitions: template1Manifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
          result[parameter.name] = {
            ...parameter,
            value: parameter.default,
          };
          return result;
        }, {}),
        validationErrors: {},
      },
      connections: template1Manifest.connections,
    };
    const minimalStoreData = {
      template: templateSliceData,
    };
    store = setupStore(minimalStoreData);

    renderWithProviders(<DisplayParameters />, { store });

    expect(screen.getByText(template1Manifest?.parameters[0].name)).toBeDefined();
    expect(screen.getByText(template1Manifest.parameters[0].type)).toBeDefined();
    expect(screen.getByText(template1Manifest.parameters[0].description)).toBeDefined();
    // expect(screen.getByText(template1Manifest.parameters[0]?.value)).toBeDefined();
  });
});
