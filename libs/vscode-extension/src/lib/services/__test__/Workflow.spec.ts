import { describe, it, expect } from 'vitest';
import { resolveConnectionsReferences } from '../Workflow';

describe('resolveConnectionsReferences', () => {
  it('should replace parameter references with their corresponding values', () => {
    const content = `"@parameters('foo')"`;
    const parameters = {
      foo: {
        type: 'String',
        value: 'bar',
      },
    };
    const result = resolveConnectionsReferences(content, parameters);
    expect(result).toEqual('bar');
  });

  it('should replace appsetting references with their corresponding values', () => {
    const content = `"@appsetting('foo')"`;
    const appsettings = {
      foo: 'bar',
    };
    const result = resolveConnectionsReferences(content, undefined, appsettings);
    expect(result).toEqual('bar');
  });

  it('should replace appsetting and parameters references with their corresponding values', () => {
    const content = `"@parameters('foo')"`;
    const parameters = {
      foo: {
        type: 'Object',
        value: {
          api: {
            id: "@{appsetting('foo')}",
          },
        },
      },
    };
    const appsettings = {
      foo: 'bar',
    };
    const result = resolveConnectionsReferences(content, parameters, appsettings);
    expect(result).toEqual({ api: { id: 'bar' } });
  });

  it('should not replace appsetting references if the value is a KeyVault reference', () => {
    const content = `"@appsetting('foo')"`;
    const appsettings = {
      foo: '@Microsoft.KeyVault(secret)',
    };
    const result = resolveConnectionsReferences(content, undefined, appsettings);
    expect(result).toEqual("@appsetting('foo')");
  });

  it('should replace both parameter and appsetting references', () => {
    const content = `"@parameters('foo') - @appsetting('bar')"`;
    const parameters = {
      foo: {
        type: 'String',
        value: 'hello',
      },
    };
    const appsettings = {
      bar: 'world',
    };
    const result = resolveConnectionsReferences(content, parameters, appsettings);
    expect(result).toEqual('hello - world');
  });

  it('should return the original content if no parameters or appsettings are provided', () => {
    const content = `"@parameters('foo') - @appsetting('bar')"`;
    const result = resolveConnectionsReferences(content, undefined);
    expect(result).toEqual("@parameters('foo') - @appsetting('bar')");
  });

  it('should throw an error if the resolved content is not a valid JSON', () => {
    expect(() => {
      resolveConnectionsReferences('', {});
    }).toThrowError(new Error('Failure in resolving connection parameterization'));
  });
});
