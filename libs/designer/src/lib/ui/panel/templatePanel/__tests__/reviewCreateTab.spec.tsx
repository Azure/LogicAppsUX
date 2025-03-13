import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { ReviewCreatePanel } from '../../../templates/review/ReviewCreatePanel';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import type { TemplateState } from '../../../../core/state/templates/templateSlice';
import type { WorkflowState } from '../../../../core/state/templates/workflowSlice';
import type { Template } from '@microsoft/logic-apps-shared';

describe('panel/templatePanel/createWorkflowPanel/reviewCreateTab', () => {
  let store: AppStore;
  let param1: Template.ParameterDefinition;
  let param2: Template.ParameterDefinition;

  beforeAll(() => {
    param1 = {
      name: 'param1',
      displayName: 'param 1',
      type: 'String',
      description: 'param1 description',
      default: 'param1DefaultValue',
    };
    param2 = {
      name: 'param2',
      displayName: 'param 2',
      type: 'Object',
      description: 'param2 description',
    };
    const parameters = [param1, param2];

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
      parameterDefinitions: parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
        result[parameter.name] = {
          ...parameter,
          value: parameter.default,
        };
        return result;
      }, {}),
      connections: {},
      errors: {
        parameters: {},
        connections: undefined,
      },
    };

    const workflowSliceData: WorkflowState = {
      existingWorkflowName: 'workflowName 1',
      connections: {
        references: {},
        mapping: {},
      },
      subscriptionId: 'test',
      location: 'eastus',
      resourceGroup: 'test',
      isConsumption: false,
      isCreateView: false,
    };

    const minimalStoreData = {
      template: templateSliceData,
      workflow: workflowSliceData,
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    const queryClient = getReactQueryClient();

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <ReviewCreatePanel />
      </QueryClientProvider>,

      { store }
    );
  });

  it('Shows Review Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE);
    expect(screen.getAllByText('Basics')).toBeDefined();
    expect(screen.getAllByText('Workflow name')).toBeDefined();
    expect(screen.getAllByText(store.getState().template.workflows['default'].workflowName ?? 'n/a')).toBeDefined;
    expect(screen.getAllByText('Parameters')).toBeDefined();
    expect(screen.getAllByText(param1.displayName)).toBeDefined();
    expect(screen.getAllByText(param1.default)).toBeDefined();
    expect(screen.getAllByText(param2.displayName)).toBeDefined();
    expect(screen.getAllByText('State type')).toBeDefined();
    expect(screen.getAllByText('Stateless')).toBeDefined();
  });
});
