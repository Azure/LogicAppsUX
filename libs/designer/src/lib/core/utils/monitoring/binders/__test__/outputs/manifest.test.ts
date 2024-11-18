import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManifestOutputsBinder } from '../../outputs/manifest';
import parseJson from '../../__mocks__/parseJson';
import * as helperModules from '../../../../parameters/helper'; // Import the module that contains the external function

describe('ManifestOutputsBinder', () => {
  let binder: ManifestOutputsBinder;
  let manifest;
  let nodeParameters;
  let metadata: Record<string, any> | undefined;
  const bindedOutputs = {
    body: {
      displayName: 'Body',
      value: {
        'category-actions': {
          name: 'Navigate To URL',
          type: 'navigateTo',
          value: 'Error! Hyperlink reference not valid.',
          foreground: true,
          authentication: true,
          destructive: false,
        },
      },
    },
    'body.category-actions.name': {
      displayName: 'Body name',
      value: 'Navigate To URL',
    },
    'body.category-actions.type': {
      displayName: 'Body type',
      value: 'navigateTo',
    },
    'body.category-actions.value': {
      displayName: 'Body value',
      value: 'Error! Hyperlink reference not valid.',
    },
    'body.category-actions.foreground': {
      displayName: 'Body foreground',
      value: true,
    },
    'body.category-actions.authentication': {
      displayName: 'Body authentication',
      value: true,
    },
    'body.category-actions.destructive': {
      displayName: 'Body destructive',
      value: false,
    },
    'body.category-actions': {
      displayName: 'Body category-actions',
      value: {
        name: 'Navigate To URL',
        type: 'navigateTo',
        value: 'Error! Hyperlink reference not valid.',
        foreground: true,
        authentication: true,
        destructive: false,
      },
    },
  };

  beforeEach(() => {
    manifest = parseJson.manifest;
    nodeParameters = parseJson.nodeParameters;
    metadata = parseJson.operationMetadata;
    binder = new ManifestOutputsBinder(manifest, nodeParameters, metadata);
  });

  it('should return undefined when outputs are undefined', async () => {
    const result = await binder.bind(undefined, {});
    expect(result).toEqual(undefined);
  });

  it('should bind outputs correctly', async () => {
    const result = await binder.bind(parseJson.outputs, parseJson.outputsParametersByName);

    expect(result).toStrictEqual(bindedOutputs);
  });

  it('should call functions to bind inputs properly', async () => {
    const spyUpdateParameter = vi.spyOn(helperModules, 'updateParameterWithValues');
    const spyGetParameterValue = vi.spyOn(binder, 'getParameterValue');
    const spyBind = vi.spyOn(binder, 'bind');

    const result = await binder.bind(parseJson.outputs, parseJson.outputsParametersByName);

    expect(spyGetParameterValue).toHaveBeenCalled();
    expect(spyBind).toHaveBeenCalled();
    expect(spyUpdateParameter).toHaveBeenCalled();
    expect(result).toStrictEqual(bindedOutputs);
  });
});
