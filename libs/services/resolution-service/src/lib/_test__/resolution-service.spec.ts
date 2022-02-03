import { ResolutionService } from './../resolution-service';

describe('Resolution Service tests', () => {
  it('should resolve a full string replacement correctly', () => {
    const parameters = {
      foo: 'bar',
    };
    const unresolvedString = "@parameters('foo')";
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual('bar');
  });

  it('should not fail when there are no expressions to be resolved', () => {
    const parameters = {
      foo: 'bar',
    };
    const unresolvedString = 'foo';
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual('foo');
  });

  it('should only resolve expressions that match the provided expression name', () => {
    const parameters = {
      foo: 'bar',
    };
    const unresolvedString = "@appsettings('foo')";
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual("@appsettings('foo')");
  });

  it('should not throw an error when the parameter values are not provided', () => {
    const parameters = {};
    const unresolvedString = "@parameters('foo')";
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual(unresolvedString);
  });

  it('should not fail when resolve already resolved expressions', () => {
    const parameters = {
      foo: 'bar',
    };
    const unresolvedString = "Parameters: foo @ @{parameters('foo')}";
    const service = new ResolutionService(parameters, {});
    const resolvedString = service.resolve(unresolvedString);
    expect(resolvedString).toEqual('Parameters: foo @ bar');
    expect(service.resolve(resolvedString)).toEqual('Parameters: foo @ bar');
  });

  it('should resolve a simple string replacement correctly', () => {
    const parameters = {
      foo: 'bar',
    };
    const unresolvedString = "Parameters: foo @ @{parameters('foo')}";
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual('Parameters: foo @ bar');
  });

  it('should resolve a full object correctly and not modify the original object', () => {
    const parameters: Record<string, unknown> = {
      foo: {
        value: {
          message: 'bar',
        },
      },
      fooString: 'barString',
      fooNumber: 34,
      fooBool: true,
      fooFloat: 1996.0325,
      fooArray: [1, 2, 3, 4],
    };

    const unresolvedObject = {
      foo: "@parameters('foo')",
      fooString: "@parameters('fooString')",
      fooNumber: "@parameters('fooNumber')",
      fooBool: "@parameters('fooBool')",
      fooFloat: "@parameters('fooFloat')",
      fooArray: "@parameters('fooArray')",
    };
    const expectedObject = {
      foo: {
        value: {
          message: 'bar',
        },
      },
      fooString: 'barString',
      fooNumber: 34,
      fooBool: true,
      fooFloat: 1996.0325,
      fooArray: [1, 2, 3, 4],
    };
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedObject)).toEqual(expectedObject);
    expect(unresolvedObject['foo']).toEqual("@parameters('foo')");
  });

  it('should correctly resolve expressions with objects as values', () => {
    const parameters: Record<string, unknown> = {
      foo: {
        value: {
          message: 'bar',
        },
      },
    };
    const unresolvedObject = {
      foo: "@parameters('foo')",
    };
    const expectedObject = {
      foo: {
        value: {
          message: 'bar',
        },
      },
    };
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedObject)).toEqual(expectedObject);
  });
});
