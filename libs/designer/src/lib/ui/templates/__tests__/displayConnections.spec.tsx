import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import { InitConnectionService, type Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import type { TemplateState } from '../../../core/state/templates/templateSlice';
import { WorkflowConnections } from '../connections/workflowconnections';
import { ReactQueryProvider } from '../../../core/ReactQueryProvider';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/workflowconnections', () => {
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
      details: {},
      tags: [],
      images: {},
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
      ],
      connections: {
        conn1: { connectorId: '/serviceProviders/abc', kind: 'inapp' },
      },
      parameters: [],
    };

    templateSliceData = {
      workflows: {
        default: {
          id: 'default',
          workflowName: undefined,
          kind: undefined,
          manifest: template1Manifest,
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          connectionKeys: Object.keys(template1Manifest.connections),
          errors: {
            workflow: undefined,
            kind: undefined,
          },
        },
      },
      manifest: template1Manifest,
      templateName: template1Manifest.title,
      parameterDefinitions: {},
      connections: template1Manifest.connections,
      servicesInitialized: false,
      errors: {
        parameters: {},
        connections: undefined,
      },
    };
    const minimalStoreData = {
      template: templateSliceData,
    };
    store = setupStore(minimalStoreData);

    InitConnectionService({
      getConnector: async () => Promise.resolve({ id: '/serviceProviders/abc', properties: { iconUrl: 'iconUrl', displayName: 'AB C' } }),
    } as any);
  });

  beforeEach(() => {
    renderWithProviders(
      <ReactQueryProvider>
        <WorkflowConnections connections={template1Manifest.connections} />
      </ReactQueryProvider>,
      { store }
    );
  });

  it('should render the connection ids for connections', async () => {
    const conn = template1Manifest?.connections['conn1'];
    expect(screen.getByText('Name')).toBeDefined();
  });
});
