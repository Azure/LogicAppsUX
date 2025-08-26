import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InputsBinder from '../inputs';
import { ApiConnectionInputsBinder, DefaultInputsBinder, ManifestInputsBinder } from '../inputs/index';
import constants from '../../../../../common/constants';

let inputsBinder: InputsBinder;
const parsedInputs = { bound: 'parameters' };
const nodeParameters = {};
const operationMetadata = {};
const inputParametersByName = {};

const customSwagger = undefined;
let spy: any;

describe('InputsBinder', () => {
  beforeEach(() => {
    inputsBinder = new InputsBinder();
  });
  afterEach(() => {
    spy?.mockRestore();
  });

  it('should bind inputs using ManifestInputsBinder when manifest is provided and type is not special', async () => {
    const inputs = { key: 'value' };
    const type = 'JavaScriptCode';
    const operation = undefined;
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

    const mockBind = vi.fn().mockResolvedValue(parsedInputs);
    vi.spyOn(ManifestInputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await inputsBinder.bind(
      inputs,
      type,
      inputParametersByName,
      operation,
      manifest,
      customSwagger,
      nodeParameters,
      operationMetadata
    );

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedInputs]);
  });

  it('should bind inputs using ApiConnectionInputsBinder when type is API_CONNECTION', async () => {
    const inputs = { key: 'value' };
    const type = constants.NODE.TYPE.API_CONNECTION;
    const operation = {
      operationId: 'SendEmailV2',
      description: 'This operation sends an email message.',
      method: 'post',
      path: '/{connectionId}/v2/Mail',
      summary: 'Send an email (V2)',
      visibility: 'important',
    };
    const manifest = undefined;

    const mockBind = vi.fn().mockResolvedValue(parsedInputs);
    vi.spyOn(ApiConnectionInputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await inputsBinder.bind(
      inputs,
      type,
      inputParametersByName,
      operation,
      manifest,
      customSwagger,
      nodeParameters,
      operationMetadata
    );

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedInputs]);
  });

  it('should bind inputs using DefaultInputsBinder when no special conditions are met', async () => {
    const inputs = { key: 'value' };
    const type = constants.NODE.TYPE.INCREMENT_VARIABLE;
    const operation = undefined;
    const manifest = undefined;

    const mockBind = vi.fn().mockResolvedValue(parsedInputs);
    vi.spyOn(DefaultInputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await inputsBinder.bind(
      inputs,
      type,
      inputParametersByName,
      operation,
      manifest,
      customSwagger,
      nodeParameters,
      operationMetadata
    );

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedInputs]);
  });

  it('should bind inputs using DefaultInputsBinder when is If node type', async () => {
    const inputs = [{ key: 'value' }];
    const type = constants.NODE.TYPE.IF;
    const operation = undefined;
    const manifest = undefined;

    const mockBind = vi.fn().mockResolvedValue(parsedInputs);
    vi.spyOn(DefaultInputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await inputsBinder.bind(
      inputs,
      type,
      inputParametersByName,
      operation,
      manifest,
      customSwagger,
      nodeParameters,
      operationMetadata
    );

    expect(mockBind).toHaveBeenCalled();
    expect(result).toEqual([parsedInputs]);
  });

  it('should not bind inputs and return an empty array when inptus is an empty array', async () => {
    const inputs = [];
    const type = constants.NODE.TYPE.FOREACH;
    const operation = undefined;
    const manifest = undefined;

    const mockBind = vi.fn().mockResolvedValue(parsedInputs);
    vi.spyOn(DefaultInputsBinder.prototype, 'bind').mockImplementation(mockBind);

    const result = await inputsBinder.bind(
      inputs,
      type,
      inputParametersByName,
      operation,
      manifest,
      customSwagger,
      nodeParameters,
      operationMetadata
    );

    expect(mockBind).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
