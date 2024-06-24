import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { TemplatesDataProvider } from '../TemplatesDataProvider';
import { type RootState, setupStore, type AppStore } from '../../state/templates/store';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { TemplatesDesignerProvider } from '../TemplatesDesignerProvider';
import { ReactQueryProvider } from '../../ReactQueryProvider';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('templates/TemplatesDataProvider', () => {
  let store: AppStore;

  beforeEach(() => {
    const minimalStoreData: Partial<RootState> = {
      workflow: {
        isConsumption: false,
        subscriptionId: '',
        resourceGroup: '',
        location: '',
        connections: { references: {}, mapping: {}},
      },
      template: {
        workflowDefinition: undefined,
        manifest: undefined,
        workflowName: undefined,
        kind: undefined,
        parameters: {
          definitions: {},
          validationErrors: {},
        },
        connections: {},
        servicesInitialized: true,
      },
      manifest: {
        availableTemplateNames: ['undefined'],
      },
    };
    // store = templateStore;
    store = setupStore({});

    expect(store.getState().template.workflowName).toBe(undefined);
    expect(store.getState()?.manifest?.availableTemplateNames).toBe(undefined);

    renderWithProviders(
      <ReactQueryProvider>
        <TemplatesDesignerProvider locale="en-US" theme={'light'}>
          <TemplatesDataProvider
            resourceDetails={{ subscriptionId: 'sub', resourceGroup: 'rg', location: 'us' }}
            isConsumption={false}
            existingWorkflowName={'workflowName'}
            connectionReferences={{}}
            services={{
              connectionService: {} as any,
              oAuthService: {} as any,
              workflowService: {} as any,
            }}
          >
            <div>{'Children'}</div>
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </ReactQueryProvider>,
      { store }
    );
  });

  it('Ensure template state for showing information is correct', async () => {
    expect(screen.getByText('Children')).toBeDefined();
  });
});
