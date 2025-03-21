import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { WorkflowBasics } from '../createWorkflowPanel/tabs/basicsTab';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import type { TemplateState } from '../../../../core/state/templates/templateSlice';

describe('panel/templatePanel/createWorkflowPanel/nameStateTab', () => {
  let store: AppStore;

  beforeAll(() => {
    const templateSliceData: TemplateState = {
      workflows: {
        default: {
          id: 'default',
          workflowName: 'workflowName 1',
          kind: undefined,
          manifest: {
            id: 'default',
            title: 'Template 1',
            summary: 'Template 1 Description',
            kinds: [],
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
            parameters: [],
          },
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          connectionKeys: [],
          errors: {
            workflow: undefined,
            kind: undefined,
          },
        },
      },
      manifest: undefined,
      parameterDefinitions: {},
      connections: {},
      errors: {
        parameters: {},
        connections: undefined,
      },
    };
    const minimalStoreData = {
      template: templateSliceData,
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: constants.TEMPLATE_TAB_NAMES.BASIC,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    const queryClient = getReactQueryClient();

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <WorkflowBasics />
      </QueryClientProvider>,

      { store }
    );
  });

  it('Shows Name and State Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_TAB_NAMES.BASIC);
    expect(screen.getAllByText('Workflow name')).toBeDefined();
    expect(screen.getAllByDisplayValue(store.getState().template.workflows['default'].workflowName ?? 'n/a')).toBeDefined;
    expect(screen.getAllByText('State type')).toBeDefined();
    expect(screen.getAllByText('Stateful')).toBeDefined();
    expect(screen.getAllByText('Optimized for high reliability')).toBeDefined();
    expect(screen.getAllByText('Ideal for process business transitional data')).toBeDefined();
    expect(screen.getAllByText('Stateless')).toBeDefined();
    expect(screen.getAllByText('Optimized for low latency')).toBeDefined();
    expect(screen.getAllByText('Ideal for request-response and processing IoT events')).toBeDefined();
  });
});
