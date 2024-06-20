import { describe, beforeAll, expect, it, beforeEach, vi } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { updateKind, type TemplateState } from '../../../../core/state/templates/templateSlice';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { TemplatePanel } from '../templatePanel';

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
      details: {},
      images: {},
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
      servicesInitialized: false,
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
    renderWithProviders(<TemplatePanel onCreateClick={vi.fn()} redirectCallback={vi.fn()} getExistingWorkflowNames={vi.fn()} />, { store });
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
  });

  it('Hides Connections Tab on no connections', async () => {
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS)).toBe(null);
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS)).toBeDefined();
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE)).toBeDefined();
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE)).toBeDefined();
  });

  it('Ensure clicking on next tab button for sequential ordering does not work', async () => {
    screen.getByTestId(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE).click();
    expect(store.getState().panel.selectedTabId).toBe(undefined);
    screen.getByTestId(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE).click();
    expect(store.getState().panel.selectedTabId).toBe(undefined);
  });

  it('Ensure clicking on primary button moves onto next tab only with no missing info', async () => {
    screen.getByTestId('template-footer-primary-button').click(); // no missing info (no required parameters)
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE);
    screen.getByTestId('template-footer-primary-button').click(); // missing info (kind), should not move to next tab
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE);
  });

  it('Ensure clicking on primary button moves onto next tab when missing info is filled', async () => {
    screen.getByTestId('template-footer-primary-button').click(); // no missing info (no required parameters)
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE);
    store.dispatch(updateKind('stateful'));
    expect(store.getState().template.kind).toEqual('stateful');
    expect(store.getState().template.workflowName).toEqual(''); // Empty string is considered as missing info
    screen.getByTestId('template-footer-primary-button').click();
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE);
  });
});
