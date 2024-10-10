import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { DisplayParameters } from '../parameters/displayParameters';
import { updateTemplateParameterValue, type TemplateState } from '../../../core/state/templates/templateSlice';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/DisplayParameters', () => {
  let store: AppStore;
  let templateSliceData: TemplateState;
  let template1Manifest: Template.Manifest;
  let param1DefaultValue: string;
  let param2DefaultValue: string;

  beforeAll(() => {
    param1DefaultValue = 'default value for param 1';
    param2DefaultValue = 'boolean';
    template1Manifest = {
      title: 'Template 1',
      description: 'Template 1 Description',
      tags: [],
      details: {},
      images: {},
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
      workflows: {},
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
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    renderWithProviders(<DisplayParameters />, { store });
  });

  it('DisplayParameters with default case ', async () => {
    const parameter1 = template1Manifest?.parameters[0];
    expect(screen.getByText(parameter1.displayName)).toBeDefined();
    expect(screen.getByText(parameter1.type)).toBeDefined();
    expect(screen.getAllByDisplayValue(param1DefaultValue)).toBeDefined();
  });

  it('Renders DisplayParameters, updating parameter with wrong type ', async () => {
    const parameter2 = template1Manifest?.parameters[1];

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
    const parameter3 = template1Manifest?.parameters[2];

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
});
