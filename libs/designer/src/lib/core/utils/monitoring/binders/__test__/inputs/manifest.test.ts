import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManifestInputsBinder } from '../../inputs/index';
import initializeVariable from '../../__mocks__/initializeVariable';
import * as helperModules from '../../../../parameters/helper'; // Import the module that contains the external function

describe('ManifestInputsBinder', () => {
  let binder: ManifestInputsBinder;
  let manifest;
  let nodeParameters;
  let metadata: Record<string, any> | undefined;
  const bindedInputs = {
    name: {
      displayName: 'Name',
      value: 'TEST',
    },
    type: {
      displayName: 'Type',
      value: 'Integer',
    },
    value: {
      displayName: 'Value',
      value: 2,
      visibility: 'important',
    },
  };

  beforeEach(() => {
    manifest = initializeVariable.manifest;
    nodeParameters = initializeVariable.nodeParameters;
    metadata = initializeVariable.operationMetadata;
    binder = new ManifestInputsBinder(manifest, nodeParameters, metadata);
  });

  it('should return undefined when inputs are undefined', async () => {
    const result = await binder.bind(undefined, {}, undefined);
    expect(result).toEqual(undefined);
  });

  it('should bind inputs correctly', async () => {
    const result = await binder.bind(initializeVariable.inputs, initializeVariable.inputsParameterByName, initializeVariable.customSwagger);
    expect(result).toBeDefined();
  });

  it('should get parameter value by alias', async () => {
    const result = await binder.bind(initializeVariable.inputs, initializeVariable.inputsParameterByName, initializeVariable.customSwagger);
    expect(result).toStrictEqual(bindedInputs);
  });

  it('should call functions to bind inputs properly', async () => {
    const spyInputsValue = vi.spyOn(helperModules, 'getInputsValueFromDefinitionForManifest');
    const spyGetParameterValue = vi.spyOn(binder, 'getParameterValue');
    const spyBind = vi.spyOn(binder, 'bind');

    const result = await binder.bind(initializeVariable.inputs, initializeVariable.inputsParameterByName, initializeVariable.customSwagger);

    expect(spyGetParameterValue).toHaveBeenCalled();
    expect(spyBind).toHaveBeenCalled();
    expect(spyInputsValue).toHaveBeenCalled();
    expect(result).toStrictEqual(bindedInputs);
  });
});
