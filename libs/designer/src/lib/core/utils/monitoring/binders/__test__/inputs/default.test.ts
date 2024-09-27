import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultInputsBinder } from '../../inputs/index';
import * as externalModule from '../../../index'; // Import the module that contains the external function
import { afterEach } from 'node:test';

let binder: DefaultInputsBinder;
let spy: any;

describe('DefaultInputsBinder', () => {
  beforeEach(() => {
    binder = new DefaultInputsBinder({}, {});
  });

  afterEach(() => {
    spy?.mockRestore();
  });

  it('should return an empty object when inputs are undefined', () => {
    const result = binder.bind(undefined);
    expect(result).toEqual({});
  });

  it('should handle null inputs gracefully', () => {
    const result = binder.bind(null);
    expect(result).toEqual({});
  });

  it('should handle empty object inputs gracefully', () => {
    const result = binder.bind({});
    expect(result).toEqual({});
  });

  it('should return parsed inputs when inputs are a non-empty array', () => {
    const inputs = [{ key: 'value' }];
    const parsedInputs = { key: { displayName: 'key', value: 'value' } };

    spy = vi.spyOn(externalModule, 'parseInputs').mockReturnValue(parsedInputs);

    const result = binder.bind(inputs);
    expect(result).toEqual(parsedInputs);
    expect(spy).toHaveBeenCalled();
  });

  it('should handle inputs with nested objects', () => {
    const inputs = { key: { nestedKey: 'nestedValue' } };
    const parsedInputs = { key: { displayName: 'key', value: {} } };

    spy = vi.spyOn(externalModule, 'parseInputs').mockReturnValue(parsedInputs);

    const result = binder.bind(inputs);
    expect(result).toEqual(parsedInputs);
    expect(spy).toHaveBeenCalled();
  });

  it('should handle inputs with arrays', () => {
    const inputs = { key: ['value1', 'value2'] };
    const parsedInputs = { key: { displayName: 'key', value: ['parsedValue1', 'parsedValue2'] } };

    spy = vi.spyOn(externalModule, 'parseInputs').mockReturnValue(parsedInputs);

    const result = binder.bind(inputs);
    expect(result).toEqual(parsedInputs);
    expect(spy).toHaveBeenCalled();
  });

  it('should handle inputs with mixed types', () => {
    const inputs = { key1: 'value1', key2: 2, key3: true };
    const parsedInputs = {
      key1: { displayName: 'key1', value: 'value1' },
      key2: { displayName: 'key2', value: 2 },
      key3: { displayName: 'key3', value: true },
    };

    spy = vi.spyOn(externalModule, 'parseInputs').mockReturnValue(parsedInputs);

    const result = binder.bind(inputs);
    expect(result).toEqual(parsedInputs);
    expect(spy).toHaveBeenCalled();
  });
});
