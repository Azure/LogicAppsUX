import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { InitOperationManifestService, type Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { ParametersPanel } from '../createWorkflowPanel/tabs/parametersTab';
import { ReactQueryProvider } from '../../../../core/ReactQueryProvider';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import type { TemplateState } from '../../../../core/state/templates/templateSlice';

describe('panel/templatePanel/createWorkflowPanel/parametersTab', () => {
  let store: AppStore;
  let param1: Template.ParameterDefinition;
  let param2: Template.ParameterDefinition;
  const manifestService = {
    isSupported: () => true,
    getOperationManifest: () => Promise.resolve({ properties: { connector: { properties: { displayName: 'connector' } } } }),
  };

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
      templateName: 'title',
      manifest: undefined,
      workflows: {},
      parameterDefinitions: parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
        result[parameter.name] = {
          ...parameter,
          value: parameter.default,
        };
        return result;
      }, {}),
      connections: {},
      errors: {
        manifest: {},
        workflows: {},
        parameters: {},
        connections: undefined,
      },
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
    InitOperationManifestService(manifestService as any);
  });

  beforeEach(() => {
    renderWithProviders(
      <ReactQueryProvider>
        <ParametersPanel />
      </ReactQueryProvider>,
      { store }
    );
  });

  it('Shows Parameters Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS);
    expect(store.getState().template.parameterDefinitions['param1'].type).toBe('String');
    expect(store.getState().template.parameterDefinitions['param2'].type).toBe('Object');
    expect(screen.getAllByText(param1.displayName)).toBeDefined();
    expect(screen.getAllByText(param1.type)).toBeDefined();
    expect(screen.getAllByText(param2.displayName)).toBeDefined();
    expect(screen.getAllByText(param2.type)).toBeDefined();
  });
});
