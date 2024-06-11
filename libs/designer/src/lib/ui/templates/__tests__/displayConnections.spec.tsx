import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import type { TemplateState } from '../../../core/state/templates/templateSlice';
import { DisplayConnections } from '../connections/displayConnections';

describe('ui/templates/displayConnections', () => {
  let store: AppStore;
  let templateSliceData: TemplateState;
  let template1Manifest: Template.Manifest;
  let param1DefaultValue: string;
  let param2DefaultValue: string;

  beforeAll(() => {
    param1DefaultValue = 'default value for param 1';
    param2DefaultValue = 'boolean';
    template1Manifest = {
      title: 'Template 1',
      description: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      kinds: ['stateful', 'stateless'],
      tags: {},
      images: {},
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
      ],
      connections: {
        conn1: { id: '/serviceProviders/abc', kind: 'inapp' },
      },
      parameters: [],
    };

    templateSliceData = {
      workflowName: undefined,
      kind: undefined,
      templateName: template1Manifest.title,
      manifest: template1Manifest,
      workflowDefinition: {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '',
      },
      parameters: {
        definitions: {},
        validationErrors: {},
      },
      connections: template1Manifest.connections,
    };
    const minimalStoreData = {
      template: templateSliceData,
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    renderWithProviders(<DisplayConnections connections={template1Manifest.connections} />, { store });
  });

  it('should render the connection ids for connections', async () => {
    const conn = template1Manifest?.connections['conn1'];
    expect(screen.getByText(`1: ${conn.id}`)).toBeDefined();
  });
});
