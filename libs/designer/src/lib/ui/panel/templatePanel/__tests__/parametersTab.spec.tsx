import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { ParametersPanel } from '../createWorkflowPanel/tabs/parametersTab';

describe('panel/templatePanel/createWorkflowPanel/parametersTab', () => {
  let store: AppStore;
  let param1: Template.ParameterDefinition;
  let param2: Template.ParameterDefinition;

  beforeAll(() => {
    param1 = {
      name: 'param1',
      displayName: 'param 1',
      type: 'string',
      description: 'param1 description',
      default: 'param1DefaultValue',
    };
    param2 = {
      name: 'param2',
      displayName: 'param 2',
      type: 'object',
      description: 'param2 description',
    };
    const parameters = [param1, param2];

    const templateSliceData = {
      workflowName: '',
      kind: undefined,
      templateName: 'title',
      manifest: undefined,
      workflowDefinition: undefined,
      parameters: {
        definitions: parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
          result[parameter.name] = {
            ...parameter,
            value: parameter.default,
          };
          return result;
        }, {}),
        validationErrors: {},
      },
      connections: {},
    };
    const minimalStoreData = {
      template: templateSliceData,
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    renderWithProviders(<ParametersPanel />, { store });
  });

  it('Shows Parameters Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS);
    expect(store.getState().template.parameters.definitions['param1'].type).toBe('string');
    expect(store.getState().template.parameters.definitions['param2'].type).toBe('object');
    expect(screen.getAllByText(param1.displayName)).toBeDefined();
    expect(screen.getAllByText(`Value (${param1.type})`)).toBeDefined();
    expect(screen.getAllByText(param1.description)).toBeDefined();
    expect(screen.getAllByText(param2.displayName)).toBeDefined();
    expect(screen.getAllByText(`Value (${param2.type})`)).toBeDefined();
    expect(screen.getAllByText(param2.description)).toBeDefined();
  });
});
