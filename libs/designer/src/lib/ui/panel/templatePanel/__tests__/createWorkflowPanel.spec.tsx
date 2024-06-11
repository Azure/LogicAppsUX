import { describe, beforeAll, expect, it, beforeEach, vi } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import type { TemplateState } from '../../../../core/state/templates/templateSlice';
import { CreateWorkflowPanel } from '../createWorkflowPanel/createWorkflowPanel';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';

describe('panel/templatePanel/createWorkflowPanel', () => {
  let store: AppStore;
  let templateSliceData: TemplateState;
  let template1Manifest: Template.Manifest;
  let param1DefaultValue: string;

  beforeAll(() => {
    param1DefaultValue = 'default value for param 1';
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
          type: 'string',
          description: 'param1 description',
          default: param1DefaultValue,
        },
        {
          name: 'param2',
          type: 'object',
          description: 'param2 description',
        },
      ],
    };

    templateSliceData = {
      workflowName: '',
      kind: undefined,
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
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: undefined,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    renderWithProviders(<CreateWorkflowPanel onCreateClick={vi.fn()} />, { store });
  });

  it('Ensure template state for showing information is correct', async () => {
    expect(store.getState().template.workflowName).toBe('');
    expect(store.getState().template.kind).toBe(undefined);
    expect(store.getState().template.templateName).toBe(template1Manifest.title);
    expect(store.getState().template.manifest).toBe(template1Manifest);
    expect(store.getState().template.parameters.definitions).toBeDefined();
    expect(store.getState().template.parameters.validationErrors).toEqual({});
    expect(store.getState().template.connections).toBe(template1Manifest.connections);
  });

  it('Shows Connections Tab for the first rendering without selected tab id', async () => {
    expect(store.getState().panel.isOpen).toBe(true);
    expect(store.getState().panel.currentPanelView).toBe('createWorkflow');
    expect(store.getState().panel.selectedTabId).toBe(undefined);
    expect(screen.getByText('Connections Tab Placeholder')).toBeDefined();
  });

  it('Shows Parameters Tab on tab click', async () => {
    screen.getByTestId(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS).click();
    expect(store.getState().panel.selectedTabId).toBe('PARAMETERS');
  });

  it('Shows Name and State Tab on tab click', async () => {
    screen.getByTestId(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE).click();
    expect(store.getState().panel.selectedTabId).toBe('NAME_AND_STATE');
  });

  it('Shows Review and Create Tab on tab click', async () => {
    screen.getByTestId(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE).click();
    expect(store.getState().panel.selectedTabId).toBe('REVIEW_AND_CREATE');
  });
});
