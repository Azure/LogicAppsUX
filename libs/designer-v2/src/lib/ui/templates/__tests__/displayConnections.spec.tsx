import { describe, beforeAll, expect, it, beforeEach, vi, afterEach } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import {
  ConnectionService,
  InitConnectionService,
  InitGatewayService,
  InitOperationManifestService,
  InitWorkflowService,
  type Template,
} from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen, waitFor } from '@testing-library/react';
import { WorkflowConnections } from '../connections/workflowconnections';
import { ReactQueryProvider } from '../../../core/ReactQueryProvider';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/workflowconnections', () => {
  let store: AppStore;
  const msnConnId = '/subscriptions/subId/resourceGroups/rgName/providers/Microsoft.Web/connections/msnweather';

  beforeAll(() => {
    const templateSliceData = {
      workflows: {
        default: {
          id: 'default',
          workflowName: undefined,
          kind: undefined,
          manifest: workflowManifest,
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          connectionKeys: Object.keys(workflowManifest.connections),
          errors: {
            workflow: undefined,
            kind: undefined,
          },
        },
      },
      manifest: templateManifest,
      templateName: templateManifest.title,
      parameterDefinitions: {},
      connections: workflowManifest.connections,
      errors: {
        parameters: {},
        connections: undefined,
      },
    };
    const workflowSliceData = {
      isConsumption: false,
      isCreateView: true,
      subscriptionId: 'subId',
      resourceGroup: 'rgName',
      location: 'westus',
      connections: {
        references: {
          'msnweather_#workflowname#': {
            api: {
              id: '/subscriptions/subId/providers/Microsoft.Web/locations/westus/managedApis/msnweather',
            },
            connection: {
              id: msnConnId,
            },
            connectionName: 'msnweather',
          },
        },
        mapping: {
          'msnweather_#workflowname#': 'msnweather_#workflowname#',
        },
      },
      workflowAppName: 'appname',
    };
    const minimalStoreData = {
      template: templateSliceData,
      workflow: workflowSliceData,
    };
    store = setupStore(minimalStoreData);

    InitConnectionService({
      getConnector: async (connectorId) =>
        Promise.resolve({
          id: connectorId,
          properties: {
            iconUrl: 'iconUrl',
            displayName: connectorId.endsWith('msnweather') ? 'Weather' : 'Outlook',
            termsOfUseUrl: connectorId.endsWith('msnweather') ? undefined : 'https://termsOfUseUrl',
          },
        }),
      getConnections: async (connectorId) => {
        return connectorId.endsWith('msnweather') ? [{ id: msnConnId, properties: { displayName: 'MSN Connection' } }] : [];
      },
      setupConnectionIfNeeded: () => Promise.resolve(),
      getUniqueConnectionName: () => Promise.resolve('msnweather-1'),
      createConnection: (connectionId) => Promise.resolve({ id: `/${connectionId}`, properties: {} }),
    } as any);
    InitWorkflowService({
      isExplicitAuthRequiredForManagedIdentity: () => false,
    } as any);
    InitGatewayService({
      getGateways: async () => [],
      getSubscriptions: async () => [],
    } as any);
    InitOperationManifestService({
      isBuiltInConnector: () => false,
    } as any);
  });

  beforeEach(() => {
    renderWithProviders(
      <ReactQueryProvider>
        <WorkflowConnections connections={workflowManifest.connections} />
      </ReactQueryProvider>,
      { store }
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render the connected and not connected connections correctly', async () => {
    await waitFor(
      () => {
        expect(screen.getByText('Outlook')).toBeDefined();
        expect(screen.getByText('Weather')).toBeDefined();

        expect(screen.getByText('Not connected', { exact: true })).toBeDefined();
        expect(screen.getByText('Connected', { exact: true })).toBeDefined();

        expect(screen.getByText('Connect')).toBeDefined();
        expect(screen.getByText('MSN Connection')).toBeDefined();
      },
      { timeout: 10000 }
    );

    const allButtons = screen.getAllByRole('button');
    expect(allButtons).toHaveLength(5);

    allButtons[4].click();

    await waitFor(
      () => {
        const menuItems = screen.getAllByRole('menuitemcheckbox');
        expect(menuItems).toHaveLength(2);
        expect(screen.getByText('Add connection')).toBeDefined();
        expect(menuItems[0].textContent).toContain('MSN Connection');
      },
      { timeout: 5000 }
    );
  });

  it('should auto create connection when connector does not require connection parameters.', async () => {
    vi.spyOn(ConnectionService(), 'getUniqueConnectionName').mockResolvedValue('msnweather-1');
    vi.spyOn(ConnectionService(), 'createConnection').mockResolvedValue({
      id: '/msnweather-1',
      properties: { displayName: 'MSN New Connection' },
    } as any);

    await waitFor(
      () => {
        expect(screen.getByText('MSN Connection')).toBeDefined();
        screen.getAllByRole('button')[4].click();
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        const addConnection = screen.getByText('Add connection');
        expect(addConnection).toBeDefined();

        addConnection.click();
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        expect(screen.getByText('MSN New Connection')).toBeDefined();
        screen.getAllByRole('button')[4].click();
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        const menuItems = screen.getAllByRole('menuitemcheckbox');
        expect(menuItems).toHaveLength(3);
        expect(menuItems[0].textContent).toContain('MSN Connection');
        expect(menuItems[1].textContent).toContain('MSN New Connection');
      },
      { timeout: 5000 }
    );
  });

  it('should not auto create connection when connector does not require connection parameters but has terms of service.', async () => {
    vi.spyOn(ConnectionService(), 'getUniqueConnectionName').mockResolvedValue('office365-1');
    screen.getByText('Connect').click();

    await waitFor(
      () => {
        expect(screen.getByText('Outlook connection')).toBeDefined();
        const allButtons = screen.getAllByRole('button');
        expect(allButtons).toHaveLength(3);
        expect(allButtons[0].textContent).toBe('Connect');
        expect(allButtons[1].textContent).toBe('Add connection');
        expect(allButtons[2].textContent).toBe('Cancel');
      },
      { timeout: 20000 }
    );
  });
});

const templateManifest: Template.TemplateManifest = {
  id: 'testtemplate',
  title: 'Test: Automated connection creation',
  summary: 'This template helps to test the automated connection creation feature.',
  skus: ['consumption', 'standard'],
  workflows: {
    default: {
      name: 'Automated_Connection',
    },
  },
  featuredConnectors: [
    {
      id: '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/msnweather',
      kind: 'shared',
    },
    {
      id: '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/office365',
      kind: 'shared',
    },
  ],
  details: {
    By: 'Microsoft',
    Type: 'Workflow',
    Category: 'Automation',
    Trigger: 'Request',
  },
  tags: ['MSN Westher', 'OOffice 365'],
};

const workflowManifest: Template.WorkflowManifest = {
  id: 'default',
  title: 'Test: Automated connection creation',
  summary: 'This template helps to test the automated connection creation feature.',
  kinds: ['stateful', 'stateless'],
  artifacts: [
    {
      type: 'workflow',
      file: 'workflow.json',
    },
  ],
  images: {
    light: 'snapshot-light.png',
    dark: 'snapshot-dark.png',
  },
  parameters: [],
  connections: {
    'office365_#workflowname#': {
      connectorId: '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/office365',
      kind: 'shared',
    },
    'msnweather_#workflowname#': {
      connectorId: '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/msnweather',
      kind: 'shared',
    },
  },
};
