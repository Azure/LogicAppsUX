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
    const unresolvedString = "@appsetting('foo')";
    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedString)).toEqual("@appsetting('foo')");
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

  it('should correctly parse out falsey values', () => {
    const parameters = {
      foo: '',
      bar: false,
    };
    const unresolvedString = "Parameters: foo @{parameters('foo')} @{parameters('bar')}";
    const service = new ResolutionService(parameters, {});
    const resolvedString = service.resolve(unresolvedString);
    expect(resolvedString).toEqual('Parameters: foo  false');
  });

  it('should correctly handle back to back interpoloations', () => {
    const parameters = {
      foo: 'foo',
      bar: 'bar',
    };
    const unresolvedString = "@{parameters('foo')}@{parameters('bar')}";
    const service = new ResolutionService(parameters, {});
    const resolvedString = service.resolve(unresolvedString);
    expect(resolvedString).toEqual('foobar');
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

  it('should correctly resolve expressions with parameters in type/value format', () => {
    const parameters: Record<string, unknown> = {
      arr: {
        type: 'Array',
        value: ['array', 'test', 'value'],
      },
      bool: {
        type: 'Bool',
        value: false,
      },
      str: {
        type: 'String',
        value: 'teststring',
      },
      obj: {
        type: 'Object',
        value: {
          test: 'value',
        },
      },
    };
    const unresolvedObject = {
      arr: "@parameters('arr')",
      bool: "@parameters('bool')",
      str: "@parameters('str')",
      obj: "@parameters('obj')",
    };
    const expectedObject = {
      arr: ['array', 'test', 'value'],
      bool: false,
      str: 'teststring',
      obj: {
        test: 'value',
      },
    };

    const service = new ResolutionService(parameters, {});
    expect(service.resolve(unresolvedObject)).toEqual(expectedObject);
  });

  //This feels like a common enough scenario to test directly
  it('should parse a arm resource ID', () => {
    const appSettings: Record<string, unknown> = {
      SUBSCRIPTION_ID: '0000-1111-2222-3333-4444',
      RESOURCE_GROUP: 'rg1',
      RESOURCE: 'resource1',
    };

    const unresolvedObject = {
      resourceId:
        "/subscriptions/@{appsetting('SUBSCRIPTION_ID')}/resourceGroups/@{appsetting('RESOURCE_GROUP')}/providers/Microsoft.Logic/workflows/@{appsetting('RESOURCE')}",
    };
    const expectedObject = {
      resourceId: '/subscriptions/0000-1111-2222-3333-4444/resourceGroups/rg1/providers/Microsoft.Logic/workflows/resource1',
    };
    const service = new ResolutionService({}, appSettings);
    expect(service.resolve(unresolvedObject)).toEqual(expectedObject);
  });

  it('should resolve correctly when both parameters and app settings are given', () => {
    const parameters = {
      key: 'password',
      username: 'username',
    };

    const appSettings = {
      key: 'username',
      password: 'password',
    };

    const input = {
      username: "@parameters('username')",
      username2: "Hello @{parameters('username')}",
      password: "@appsetting('password')",
      password2: "Bad @{appsetting('password')}",
      combined: "@parameters(appsetting('key'))",
      combined2: "Hello @{parameters(appsetting('key'))}",
    };

    const expectedObject = {
      username: 'username',
      username2: 'Hello username',
      password: 'password',
      password2: 'Bad password',
      combined: 'username',
      combined2: 'Hello username',
    };
    const service = new ResolutionService(parameters, appSettings);
    expect(service.resolve(input)).toEqual(expectedObject);
  });

  it('should resolve with multiple layers of functions', () => {
    const parameters = {
      key: 'password',
      username: 'username',
    };

    const appSettings = {
      key: 'username',
      password: 'password',
    };

    const input = {
      combined: "@parameters(appsetting(parameters(parameters(appsetting(parameters(appsetting('key')))))))",
      combined2: "Hello @{parameters(appsetting(parameters(parameters(appsetting(parameters(appsetting('key')))))))}",
      combined3: "Bad @{parameters(appsetting(parameters(parameters(appsetting(parameters(parameters('key')))))))}",
    };

    const expectedObject = {
      combined: 'username',
      combined2: 'Hello username',
      combined3: 'Bad password',
    };
    const service = new ResolutionService(parameters, appSettings);
    expect(service.resolve(input)).toEqual(expectedObject);
  });
});
