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
  let template1Manifest: Template.TemplateManifest;
  let workflow1Manifest: Template.WorkflowManifest;
  let param1DefaultValue: string;
  let param2DefaultValue: string;

  beforeAll(() => {
    param1DefaultValue = 'default value for param 1';
    param2DefaultValue = 'boolean';
    template1Manifest = {
      id: 'template1Manifest',
      title: 'Template 1',
      summary: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: '',
        Type: '',
        Category: '',
      },
      artifacts: [
        {
          type: 'description',
          file: 'description.md',
        },
      ],
    };

    workflow1Manifest = {
      id: 'default',
      title: 'Template 1',
      summary: 'Template 1 Description',
      kinds: ['stateful', 'stateless'],
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
      ],
      images: {
        light: '',
        dark: '',
      },
      connections: {},
      parameters: [
        {
          name: 'param1',
          displayName: 'Param 1',
          type: 'string',
          description: 'param1 description',
          default: param1DefaultValue,
        },
        {
          name: 'param2',
          displayName: 'Param 2',
          type: 'object',
          description: 'param2 description',
        },
      ],
    };

    templateSliceData = {
      workflows: {
        default: {
          id: 'default',
          workflowName: undefined,
          kind: undefined,
          manifest: workflow1Manifest,
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          connectionKeys: Object.keys(workflow1Manifest.connections),
          errors: {
            workflow: undefined,
            kind: undefined,
          },
        },
      },
      manifest: template1Manifest,
      templateName: template1Manifest.title,
      parameterDefinitions: {},
      connections: workflow1Manifest.connections,
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
        <WorkflowConnections connections={workflow1Manifest.connections} />
      </ReactQueryProvider>,
      { store }
    );
  });

  it('should render the connection ids for connections', async () => {
    const conn = workflow1Manifest?.connections['conn1'];
    expect(screen.getByText('Name')).toBeDefined();
  });
});
