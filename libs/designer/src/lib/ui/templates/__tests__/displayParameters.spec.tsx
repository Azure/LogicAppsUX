import { describe, beforeAll, expect, it } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import { InitOperationManifestService, type Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { DisplayParameters } from '../parameters/displayParameters';
import { updateTemplateParameterValue, type TemplateState } from '../../../core/state/templates/templateSlice';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import { ReactQueryProvider } from '../../../core/ReactQueryProvider';

describe('ui/templates/DisplayParameters', () => {
  let store: AppStore;
  let templateSliceData: TemplateState;
  let template1Manifest: Template.TemplateManifest;
  let workflow1Manifest: Template.WorkflowManifest;
  let param1DefaultValue: string;
  let param2DefaultValue: string;
  const manifestService = {
    isSupported: () => true,
    getOperationManifest: () => Promise.resolve({ properties: { connector: { properties: { displayName: 'connector' } } } }),
  };

  beforeAll(() => {
    param1DefaultValue = 'default value for param 1';
    param2DefaultValue = 'boolean';
    param1DefaultValue = 'default value for param 1';
    template1Manifest = {
      id: 'template1Manifest',
      title: 'Template 1',
      summary: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: '',
        Type: '',
        Category: '',
      },
      artifacts: [
        {
          type: 'description',
          file: 'description.md',
        },
      ],
    };

    workflow1Manifest = {
      id: 'default',
      title: 'Template 1',
      summary: 'Template 1 Description',
      kinds: ['stateful', 'stateless'],
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
      parameters: [
        {
          name: 'param1',
          displayName: 'param 1',
          type: 'string',
          description: 'param1 description',
          default: param1DefaultValue,
        },
        {
          name: 'param2',
          displayName: 'param 2',
          type: 'object',
          description: 'param2 description',
        },
        {
          name: 'param3',
          displayName: 'param 3',
          type: 'boolean',
          description: 'param3 description',
          default: param2DefaultValue,
          required: true,
        },
      ],
    };

    templateSliceData = {
      templateName: template1Manifest.title,
      workflows: {
        default: {
          id: 'default',
          workflowName: '',
          kind: undefined,
          manifest: workflow1Manifest,
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
      manifest: template1Manifest,
      parameterDefinitions: workflow1Manifest.parameters?.reduce((result: Record<string, Template.ParameterDefinition>, parameter) => {
        result[parameter.name] = {
          ...parameter,
          value: parameter.default,
        };
        return result;
      }, {}),
      connections: workflow1Manifest.connections,
      errors: {
        parameters: {},
        connections: undefined,
      },
    };

    InitOperationManifestService(manifestService as any);
  });

  it('DisplayParameters with default case ', async () => {
    store = setupStore({ template: templateSliceData });
    renderWithProviders(
      <ReactQueryProvider>
        <DisplayParameters />
      </ReactQueryProvider>,
      { store }
    );

    const parameter1 = workflow1Manifest?.parameters[0];
    expect(screen.getByText(parameter1.displayName)).toBeDefined();
    expect(screen.getByText(parameter1.type)).toBeDefined();
    expect(screen.getAllByDisplayValue(param1DefaultValue)).toBeDefined();
  });

  it('Renders DisplayParameters, updating parameter with wrong type ', async () => {
    store = setupStore({ template: templateSliceData });
    renderWithProviders(
      <ReactQueryProvider>
        <DisplayParameters />
      </ReactQueryProvider>,
      { store }
    );

    const parameter2 = workflow1Manifest?.parameters[1];

    expect(screen.getByText(parameter2.displayName)).toBeDefined();
    expect(screen.getByText(parameter2.type)).toBeDefined();

    store.dispatch(
      updateTemplateParameterValue({
        ...parameter2,
        name: parameter2.name,
        description: parameter2.description,
        displayName: parameter2.displayName,
        type: parameter2.type,
        value: 'non-object value',
      })
    );
    expect(store.getState().template.errors.parameters[parameter2.name]).toBe('Enter a valid JSON.');
  });

  it('Renders DisplayParameters, updating required parameter with empty value ', async () => {
    store = setupStore({ template: templateSliceData });
    renderWithProviders(
      <ReactQueryProvider>
        <DisplayParameters />
      </ReactQueryProvider>,
      { store }
    );

    const parameter3 = workflow1Manifest?.parameters[2];

    expect(screen.getByText(parameter3.displayName)).toBeDefined();
    expect(screen.getByText(parameter3.type)).toBeDefined();
    expect(screen.getAllByDisplayValue(param2DefaultValue)).toBeDefined();

    store.dispatch(
      updateTemplateParameterValue({
        ...parameter3,
        name: parameter3.name,
        description: parameter3.description,
        displayName: parameter3.displayName,
        value: '',
      })
    );
    expect(store.getState().template.errors.parameters[parameter3.name]).toBe('Must provide value for parameter.');
  });

  it('Renders parameters with dynamic list editor when template parameter has dynamic data support and no connection required.', async () => {
    const nodeId = 'template_default_testOperation';
    templateSliceData.parameterDefinitions['param1'] = {
      ...templateSliceData.parameterDefinitions['param1'],
      dynamicData: {
        type: 'list',
        workflow: 'default',
        operation: 'testOperation',
      },
      associatedOperationParameter: { operationId: nodeId, parameterId: 'param1_id' },
    };
    const operationSliceData = {
      operationInfo: { [nodeId]: { type: 'test', connectorId: 'connectorId', operationId: 'operationId' } },
      inputParameters: {
        [nodeId]: {
          parameterGroups: {
            default: {
              parameters: [
                {
                  id: 'param1_id',
                  name: 'inputs.$.param1',
                  dynamicData: { status: 'notstarted' },
                  editor: 'combobox',
                  editorOptions: { options: [] },
                  type: 'string',
                  value: [{ id: 'id', type: 'literal', value: '' }],
                },
              ],
            },
          },
        },
      },
      dependencies: { [nodeId]: { inputs: { 'inputs.$.param1': { dependencyType: 'ListValues' } } } },
    };
    store = setupStore({ template: templateSliceData, operation: operationSliceData as any });

    renderWithProviders(
      <ReactQueryProvider>
        <DisplayParameters />
      </ReactQueryProvider>,
      { store }
    );

    const parameter1 = workflow1Manifest?.parameters[0];
    expect(screen.getByText(parameter1.displayName)).toBeDefined();
    expect(screen.getByText(parameter1.type)).toBeDefined();
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('Renders parameters with folder picker editor when template parameter has dynamic data support and connection required.', async () => {
    const nodeId = 'template_default_testOperation';
    templateSliceData.parameterDefinitions['param1'] = {
      ...templateSliceData.parameterDefinitions['param1'],
      dynamicData: {
        type: 'picker',
        workflow: 'default',
        operation: 'testOperation',
        connection: 'connection1',
      },
      associatedOperationParameter: { operationId: nodeId, parameterId: 'param1_id' },
    };
    const operationSliceData = {
      operationInfo: { [nodeId]: { type: 'test', connectorId: 'connectorId', operationId: 'operationId' } },
      inputParameters: {
        [nodeId]: {
          parameterGroups: {
            default: {
              parameters: [
                {
                  id: 'param1_id',
                  name: 'inputs.$.param1',
                  dynamicData: { status: 'notstarted' },
                  editor: 'filepicker',
                  editorViewModel: {},
                  editorOptions: { pickerType: 'folder', fileFilters: [] },
                  type: 'string',
                  value: [{ id: 'id', type: 'literal', value: '' }],
                },
              ],
            },
          },
        },
      },
      dependencies: {
        [nodeId]: {
          inputs: {
            'inputs.$.param1': {
              dependencyType: 'TreeNavigation',
              filePickerInfo: {},
            },
          },
        },
      },
    };
    const workflowSliceData = {
      connections: {
        references: { connection1: { api: { id: 'connectorId' }, connection: { id: 'connection_1 ' } } },
        mapping: { connection1: 'connection1' },
      },
    };
    store = setupStore({ template: templateSliceData, workflow: workflowSliceData as any, operation: operationSliceData as any });

    renderWithProviders(
      <ReactQueryProvider>
        <DisplayParameters />
      </ReactQueryProvider>,
      { store }
    );

    const parameter1 = workflow1Manifest?.parameters[0];
    expect(screen.getByText(parameter1.displayName)).toBeDefined();
    expect(screen.getByText(parameter1.type)).toBeDefined();
    expect(screen.getAllByRole('button').find((button) => button.ariaLabel === 'Open folder')).toBeDefined();
  });
});
