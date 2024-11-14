import { describe, beforeAll, expect, it, beforeEach, vi } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { StandardTemplateService, InitTemplateService, type Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import type { TemplateState } from '../../../../core/state/templates/templateSlice';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { MockHttpClient } from '../../../../__test__/mock-http-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import { CreateWorkflowPanel } from '../createWorkflowPanel/createWorkflowPanel';

describe('panel/templatePanel/createWorkflowPanel', () => {
  let store: AppStore;
  let templateSliceData: TemplateState;
  let template1Manifest: Template.Manifest;
  let template2Manifest: Template.Manifest;
  let param1DefaultValue: string;
  const defaultWorkflowId = 'default';

  const httpClient = new MockHttpClient();
  InitTemplateService(
    new StandardTemplateService({
      baseUrl: '/baseUrl',
      appId: '/appId',
      httpClient,
      apiVersions: {
        subscription: '2018-07-01-preview',
        gateway: '2018-11-01',
      },
      openBladeAfterCreate: (workflowName: string | undefined) => {
        console.log('Open blade after create', workflowName);
      },
      onAddBlankWorkflow: () => {
        console.log('Add blank workflow');
      },
    })
  );

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

    template2Manifest = {
      title: 'Template 2',
      description: 'Template 2 Description - Consumption Only',
      skus: ['consumption'],
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
      workflows: {
        [defaultWorkflowId]: {
          id: defaultWorkflowId,
          workflowName: '',
          kind: undefined,
          manifest: template1Manifest,
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          errors: {
            workflow: undefined,
            kind: undefined,
          },
          connectionKeys: [],
        },
      },
      templateName: template1Manifest.title,
      manifest: template1Manifest,
      parameterDefinitions: template1Manifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
        result[parameter.name] = {
          ...parameter,
          value: parameter.default,
        };
        return result;
      }, {}),
      connections: template1Manifest.connections,
      servicesInitialized: false,
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
        selectedTabId: undefined,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    const queryClient = getReactQueryClient();

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <CreateWorkflowPanel createWorkflow={vi.fn()} />
      </QueryClientProvider>,
      { store }
    );
  });

  it('Ensure template state for showing information is correct', async () => {
    expect(store.getState().template.workflows[defaultWorkflowId].workflowName).toBe('');
    expect(store.getState().template.workflows[defaultWorkflowId].kind).toBe(undefined);
    expect(store.getState().template.templateName).toBe(template1Manifest.title);
    expect(store.getState().template.manifest).toBe(template1Manifest);
    expect(store.getState().template.parameterDefinitions).toBeDefined();
    expect(store.getState().template.errors.parameters).toEqual({});
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
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.BASIC)).toBeDefined();
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE)).toBeDefined();
  });

  it('Hides basic tab on consumption only template', async () => {
    templateSliceData = {
      workflows: {
        [defaultWorkflowId]: {
          id: defaultWorkflowId,
          workflowName: '',
          kind: undefined,
          manifest: template2Manifest,
          workflowDefinition: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '',
          },
          errors: {
            workflow: undefined,
            kind: undefined,
          },
          connectionKeys: [],
        },
      },
      templateName: template2Manifest.title,
      manifest: template2Manifest,
      parameterDefinitions: template2Manifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
        result[parameter.name] = {
          ...parameter,
          value: parameter.default,
        };
        return result;
      }, {}),
      connections: template2Manifest.connections,
      servicesInitialized: false,
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
        selectedTabId: undefined,
      },
    };
    store = setupStore(minimalStoreData);
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS)).toBe(null);
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS)).toBeDefined();
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.BASIC)).toBeNull();
    expect(screen.queryByText(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE)).toBeDefined();
  });
});
