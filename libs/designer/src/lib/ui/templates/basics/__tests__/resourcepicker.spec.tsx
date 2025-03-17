import { describe, beforeAll, expect, it, vi, afterEach } from 'vitest';
import type { RootState } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { InitResourceService } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen, waitFor } from '@testing-library/react';
import { ResourcePicker } from '../resourcepicker';
import { ReactQueryProvider } from '../../../../core/ReactQueryProvider';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import { setSubscription, setWorkflowAppDetails } from '../../../../core/state/templates/workflowSlice';

describe('ui/templates/basics/resourcepicker', () => {
  let minimalStoreData: RootState;

  beforeAll(() => {
    const optionsSlice = {
      servicesInitialized: true,
    };
    const workflowSliceData = {
      isConsumption: false,
      isCreateView: true,
      subscriptionId: 'one',
      resourceGroup: 'firstrg',
      location: 'westus',
      connections: {
        references: {
          'msnweather_#workflowname#': {
            api: {
              id: '/subscriptions/one/providers/Microsoft.Web/locations/westus/managedApis/msnweather',
            },
            connection: {
              id: '/subscriptions/one/resourceGroups/firstRG/providers/Microsoft.Web/connections/msnweather',
            },
            connectionName: 'msnweather',
          },
        },
        mapping: {
          'msnweather_#workflowname#': 'msnweather_#workflowname#',
        },
      },
      workflowAppName: 'app1',
    };
    minimalStoreData = {
      templateOptions: optionsSlice,
      workflow: workflowSliceData,
    } as any;

    InitResourceService({
      listSubscriptions: async () => {
        return [
          { id: '/subscriptions/one', name: 'one', displayName: 'Subscription 1' },
          { id: '/subscriptions/two', name: 'two', displayName: 'Subscription 2' },
        ];
      },
      listResourceGroups: async (subscriptionId: string) => {
        return subscriptionId === 'two'
          ? []
          : [
              { id: '/1', name: 'FirstRG', displayName: 'FirstRG' },
              { id: '/2', name: 'SecondRG', displayName: 'SecondRG' },
            ];
      },
      listLocations: async () => {
        return [
          { id: '/eastus', name: 'eastus', displayName: 'East US' },
          { id: '/westus', name: 'westus', displayName: 'West US' },
        ];
      },
      listLogicApps: async () => {
        return [
          { id: '/app1', name: 'app1', location: 'westus', kind: 'standard' },
          { id: '/app2', name: 'app2', location: 'eastus', kind: 'standard' },
        ] as any;
      },
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render resource dropdowns with fetched resources when store contains resource data', async () => {
    const store = setupStore(minimalStoreData);
    renderWithProviders(
      <ReactQueryProvider>
        <ResourcePicker />
      </ReactQueryProvider>,
      { store }
    );
    await waitFor(
      () => {
        expect(screen.getByText('Subscription 1')).toBeDefined();
        expect(screen.getByText('FirstRG')).toBeDefined();
        expect(screen.queryByText('West US')).toBeNull();
        expect(screen.getByText('app1')).toBeDefined();
      },
      { timeout: 10000 }
    );
  });

  it('should render error when subscription change does not contain a dependent resource.', async () => {
    const store = setupStore({ ...minimalStoreData, workflow: { ...minimalStoreData.workflow, isConsumption: true } });
    renderWithProviders(
      <ReactQueryProvider>
        <ResourcePicker />
      </ReactQueryProvider>,
      { store }
    );
    await waitFor(
      () => {
        expect(screen.getByText('Subscription 1')).toBeDefined();
        expect(screen.getByText('West US')).toBeDefined();
      },
      { timeout: 10000 }
    );

    // Since the dropdown options are not accessible, will update the store with subscription change.
    store.dispatch(setSubscription('two'));

    await waitFor(
      () => {
        expect(screen.getByText('Subscription 2')).toBeDefined();
        expect(screen.getByText('Please select a valid resource', { exact: false })).toBeDefined();
      },
      { timeout: 10000 }
    );

    expect(store.getState().workflow.subscriptionId).toBe('two');
    expect(store.getState().workflow.resourceGroup).toBe('');
    expect(store.getState().templateOptions.reInitializeServices).toBeFalsy();
    expect(store.getState().workflow.connections.mapping).toEqual({});
  });

  it('should reset state in store to reinitialize services after resource changes for standard app.', async () => {
    const store = setupStore(minimalStoreData);
    renderWithProviders(
      <ReactQueryProvider>
        <ResourcePicker />
      </ReactQueryProvider>,
      { store }
    );
    await waitFor(() => expect(screen.getByText('app1')).toBeDefined(), { timeout: 10000 });

    store.dispatch(setWorkflowAppDetails({ name: 'app2', location: 'eastus' }));

    await waitFor(
      () => {
        expect(store.getState().workflow.subscriptionId).toBe('one');
        expect(store.getState().workflow.resourceGroup).toBe('firstrg');
        expect(store.getState().workflow.location).toBe('eastus');
        expect(store.getState().workflow.workflowAppName).toBe('app2');
        expect(screen.getByText('app2')).toBeDefined();
        expect(store.getState().workflow.connections).toEqual(expect.objectContaining({ mapping: {}, references: {} }));
        expect(store.getState().templateOptions.reInitializeServices).toBeTruthy();
      },
      { timeout: 10000 }
    );
  });
});
