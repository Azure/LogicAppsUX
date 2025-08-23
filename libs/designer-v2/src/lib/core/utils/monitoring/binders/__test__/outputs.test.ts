import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OutputsBinder from '../outputs';
import { ManifestOutputsBinder, DefaultOutputsBinder, ApiConnectionOutputsBinder } from '../outputs/index';
import constants from '../../../../../common/constants';

let outputsBinder: OutputsBinder;
const parsedOutputs = { bound: 'parameters' };
const operationMetadata = {};
const outputParametersByName = {};
const nodeParameters = {};

let spy: any;

describe('OutputsBinder', () => {
  beforeEach(() => {
    outputsBinder = new OutputsBinder();
  });
  afterEach(() => {
    spy?.mockRestore();
  });

  it('should bind outputs correctly with ManifestOutputsBinder', async () => {
    const outputs = [{ outputs: { key: 'value' } }];
    const type = 'JavaScriptCode';
    const manifest = {
      properties: {
        iconUri: 'https://logicapps.azureedge.net/icons/javascript.svg',
        brandColor: '#ba5d00',
        description: 'Execute JavaScript Code',
        connection: {
          type: 'NotSpecified',
          required: false,
        },
        inputs: {},
      },
    };

    const mockBind = vi.fn().mockResolvedValue(parsedOutputs);
    vi.spyOn(ManifestOutputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await outputsBinder.bind(outputs, type, outputParametersByName, manifest, nodeParameters, operationMetadata);

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedOutputs]);
  });

  it('should bind outputs correctly with ApiConnectionOutputsBinder', async () => {
    const outputs = [{ outputs: { key: 'value' } }];
    const type = constants.NODE.TYPE.API_CONNECTION;

    const mockBind = vi.fn().mockResolvedValue(parsedOutputs);
    vi.spyOn(ApiConnectionOutputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await outputsBinder.bind(outputs, type, outputParametersByName, undefined, nodeParameters, operationMetadata);

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedOutputs]);
  });

  it('should bind outputs correctly with DefaultOutputsBinder', async () => {
    const outputs = [{ outputs: { key: 'value' } }];
    const type = constants.NODE.TYPE.IF;

    const mockBind = vi.fn().mockResolvedValue(parsedOutputs);
    vi.spyOn(DefaultOutputsBinder.prototype, 'bind').mockImplementation(mockBind);
    const result = await outputsBinder.bind(outputs, type, outputParametersByName, undefined, nodeParameters, operationMetadata);

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedOutputs]);
  });

  it('should not bind outputs and return an empty array when outputs is an empty array', async () => {
    const outputs = [];
    const type = constants.NODE.TYPE.FOREACH;

    const mockBind = vi.fn().mockResolvedValue(parsedOutputs);
    vi.spyOn(DefaultOutputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await outputsBinder.bind(outputs, type, outputParametersByName, undefined, nodeParameters, operationMetadata);

    expect(mockBind).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
