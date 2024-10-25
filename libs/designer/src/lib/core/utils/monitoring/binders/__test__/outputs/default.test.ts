import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultOutputsBinder } from '../../outputs/index';
import * as parseModules from '../../../index'; // Import the module that contains the external function

let binder: DefaultOutputsBinder;
let spy: any;

describe('DefaultOutputsBinder', () => {
  beforeEach(() => {
    binder = new DefaultOutputsBinder({}, {});
  });

  afterEach(() => {
    spy?.mockRestore();
  });
  it('should return undefined when outputs is undefined', () => {
    const result = binder.bind(undefined);
    expect(result).toEqual(undefined);
  });

  it('should handle null outputs gracefully', () => {
    const result = binder.bind(null);
    expect(result).toEqual({});
  });

  it('should handle empty object outputs gracefully', () => {
    const result = binder.bind({});
    expect(result).toEqual({});
  });

  it('should call parseOutputs with the provided outputs', () => {
    const outputs = { key: 'value' };
    const parsedOutputs = { key: { displayName: 'key', value: 'value' } };

    spy = vi.spyOn(parseModules, 'parseOutputs').mockReturnValue(parsedOutputs);

    const result = binder.bind(outputs);
    expect(result).toEqual(parsedOutputs);
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(outputs);
  });

  it('should return the result of parseOutputs', () => {
    const outputs = { parsedKey: 'value' };
    const parsedOutputs = { parsedKey: { displayName: 'parsedKey', value: 'parsedValue' } };

    spy = vi.spyOn(parseModules, 'parseOutputs').mockReturnValue(parsedOutputs);

    const result = binder.bind(outputs);
    expect(result).toEqual(parsedOutputs);
    expect(spy).toHaveBeenCalled();
  });
});
