import { MockHttpClient } from '../../../../../__test__/mock-http-client';
import { CreateConnection, parseParameterValues, type CreateConnectionProps } from '../createConnection';
import { UniversalConnectionParameter } from '../formInputs/universalConnectionParameter';
import {
  InitConnectionParameterEditorService,
  type IConnectionParameterEditorService,
  type IConnectionParameterInfo,
  InitConnectionService,
  StandardConnectionService,
} from '@microsoft/logic-apps-shared';
import type { ConnectionParameter, ConnectionParameterSets } from '@microsoft/logic-apps-shared';
import React, { type ReactElement } from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/createConnection', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  const httpClient = new MockHttpClient();
  InitConnectionService(
    new StandardConnectionService({
      apiVersion: '2018-07-01-preview',
      baseUrl: '/baseUrl',
      httpClient,
      apiHubServiceDetails: {
        apiVersion: '2018-07-01-preview',
        baseUrl: '/baseUrl',
        subscriptionId: '',
        resourceGroup: '',
        location: '',
        httpClient,
      },
      readConnections: jest.fn(),
    })
  );

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  const getConnectionParameters = (): Record<string, ConnectionParameter> => ({
    parameterA: {
      type: 'string',
    },
    hiddenParameterB: {
      type: 'string',
      uiDefinition: {
        constraints: {
          hidden: 'true',
        },
      },
    },
    hideInUIParameterC: {
      type: 'string',
      uiDefinition: {
        constraints: {
          hideInUI: 'true',
        },
      },
    },
    parameterD: {
      type: 'string',
    },
  });

  const getConnectionParameterSets = (): ConnectionParameterSets => ({
    uiDefinition: {
      description: '',
      displayName: '',
    },
    values: [
      {
        name: 'parameterSetA',
        uiDefinition: {
          description: '',
          displayName: 'first parameter set',
        },
        parameters: {
          parameterA: {
            type: 'string',
            uiDefinition: {
              description: '',
              displayName: '',
            },
          },
          hiddenParameterB: {
            type: 'string',
            uiDefinition: {
              description: '',
              displayName: '',
              constraints: {
                hidden: 'true',
              },
            },
          },
          hideInUIParameterC: {
            type: 'string',
            uiDefinition: {
              description: '',
              displayName: '',
              constraints: {
                hideInUI: 'true',
              },
            },
          },
          parameterD: {
            type: 'string',
            uiDefinition: {
              description: '',
              displayName: '',
            },
          },
        },
      },
      {
        name: 'parameterSetB',
        uiDefinition: {
          description: '',
          displayName: 'second parameter set',
        },
        parameters: {
          parameterE: {
            type: 'string',
            uiDefinition: {
              description: '',
              displayName: '',
            },
          },
        },
      },
    ],
  });

  it('should render the create connection component', () => {
    const props: CreateConnectionProps = {
      connectorId: 'myConnectorId',
      connectorDisplayName: 'My Connector',
      checkOAuthCallback: jest.fn(),
    };
    renderer.render(<CreateConnection {...props} />);
    const createConnectionContainer = renderer.getRenderOutput();

    expect(createConnectionContainer.type).toEqual('div');
    expect(createConnectionContainer.props.className).toEqual('msla-edit-connection-container');
    expect(React.Children.toArray(createConnectionContainer.props.children)).not.toHaveLength(0);

    const createConnection = findConnectionCreateDiv(createConnectionContainer);

    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);

    expect(parameterSetsDropdown).toBeUndefined();
    expect(parameters).toHaveLength(0);
  });

  it('should render visible connectionParameters', () => {
    const props: CreateConnectionProps = {
      connectorId: 'myConnectorId',
      connectorDisplayName: 'My Connector',
      connectionParameters: getConnectionParameters(),
      checkOAuthCallback: jest.fn(),
    };
    renderer.render(<CreateConnection {...props} />);
    const createConnectionContainer = renderer.getRenderOutput();
    const createConnection = findConnectionCreateDiv(createConnectionContainer);
    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);

    expect(parameterSetsDropdown).toBeUndefined();
    expect(parameters).toHaveLength(2);

    expect(parameters[0].props.parameterKey).toEqual('parameterA');
    expect(parameters[0].props.parameter).toEqual(props.connectionParameters?.['parameterA']);
    expect(parameters[0].props.value).toBeUndefined();
    expect(parameters[0].props.setValue).toEqual(expect.any(Function));

    expect(parameters[1].props.parameterKey).toEqual('parameterD');
    expect(parameters[1].props.parameter).toEqual(props.connectionParameters?.['parameterD']);
    expect(parameters[1].props.value).toBeUndefined();
    expect(parameters[1].props.setValue).toEqual(expect.any(Function));
  });

  it('should render connectionParameterSet dropdown and parameters', () => {
    const props: CreateConnectionProps = {
      connectorId: 'myConnectorId',
      connectorDisplayName: 'My Connector',
      connectionParameterSets: getConnectionParameterSets(),
      checkOAuthCallback: jest.fn(),
    };
    renderer.render(<CreateConnection {...props} />);
    const createConnectionContainer = renderer.getRenderOutput();
    const createConnection = findConnectionCreateDiv(createConnectionContainer);

    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    expect(parameterSetsDropdown).toBeDefined();

    const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);
    expect(parameters).toHaveLength(2);

    expect(parameters[0].props.parameterKey).toEqual('parameterA');
    expect(parameters[0].props.parameter).toEqual(props.connectionParameterSets?.values[0].parameters['parameterA']);
    expect(parameters[0].props.value).toBeUndefined();
    expect(parameters[0].props.setValue).toEqual(expect.any(Function));

    expect(parameters[1].props.parameterKey).toEqual('parameterD');
    expect(parameters[1].props.parameter).toEqual(props.connectionParameterSets?.values[0].parameters['parameterD']);
    expect(parameters[1].props.value).toBeUndefined();
    expect(parameters[1].props.setValue).toEqual(expect.any(Function));
  });

  describe('custom parameter editor', () => {
    const CustomConnectionParameter = () => <div>Custom Connection Parameter</div>;

    const connectionParameterEditorService = {
      getConnectionParameterEditor: jest.fn(({ parameterKey }: IConnectionParameterInfo) => {
        if (parameterKey === 'parameterA') {
          return {
            EditorComponent: CustomConnectionParameter,
          };
        }
        return undefined;
      }),
    };

    beforeEach(() => {
      connectionParameterEditorService.getConnectionParameterEditor.mockClear();
      InitConnectionParameterEditorService(connectionParameterEditorService);
    });

    afterEach(() => {
      InitConnectionParameterEditorService(undefined);
    });

    it('should support custom parameter editor for connectionParameters', () => {
      const props: CreateConnectionProps = {
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameters: getConnectionParameters(),
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);
      const parameters = findParameterComponents(createConnection, UniversalConnectionParameter, CustomConnectionParameter);

      expect(connectionParameterEditorService.getConnectionParameterEditor).toHaveBeenCalledTimes(2);
      expect(connectionParameterEditorService.getConnectionParameterEditor).toHaveBeenNthCalledWith(1, {
        connectorId: 'myConnectorId',
        parameterKey: 'parameterA',
      });
      expect(connectionParameterEditorService.getConnectionParameterEditor).toHaveBeenNthCalledWith(2, {
        connectorId: 'myConnectorId',
        parameterKey: 'parameterD',
      });

      expect(parameters).toHaveLength(2);
      expect(parameters[0].type).toEqual(CustomConnectionParameter);
      expect(parameters[0].props.parameterKey).toEqual('parameterA');
      expect(parameters[0].props.parameter).toEqual(props.connectionParameters?.['parameterA']);
      expect(parameters[0].props.value).toBeUndefined();
      expect(parameters[0].props.setValue).toEqual(expect.any(Function));

      expect(parameters[1].type).toEqual(UniversalConnectionParameter);
      expect(parameters[1].props.parameterKey).toEqual('parameterD');
      expect(parameters[1].props.parameter).toEqual(props.connectionParameters?.['parameterD']);
      expect(parameters[1].props.value).toBeUndefined();
      expect(parameters[1].props.setValue).toEqual(expect.any(Function));
    });

    it('should support custom parameter editor for connectionParameters in connectionParameterSet', () => {
      const CustomConnectionParameter = () => <div>Custom Connection Parameter</div>;

      const connectionParameterEditorService: IConnectionParameterEditorService = {
        getConnectionParameterEditor: jest.fn(({ parameterKey }) => {
          if (parameterKey === 'parameterA') {
            return {
              EditorComponent: CustomConnectionParameter,
            };
          }
          return undefined;
        }),
      };
      InitConnectionParameterEditorService(connectionParameterEditorService);

      const props: CreateConnectionProps = {
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameterSets: getConnectionParameterSets(),
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);

      const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
      expect(parameterSetsDropdown).toBeDefined();

      const parameters = findParameterComponents(createConnection, UniversalConnectionParameter, CustomConnectionParameter);

      expect(parameters).toHaveLength(2);

      expect(parameters[0].type).toEqual(CustomConnectionParameter);
      expect(parameters[0].props.parameterKey).toEqual('parameterA');
      expect(parameters[0].props.parameter).toEqual(props.connectionParameterSets?.values[0].parameters['parameterA']);
      expect(parameters[0].props.value).toBeUndefined();
      expect(parameters[0].props.setValue).toEqual(expect.any(Function));

      expect(parameters[1].type).toEqual(UniversalConnectionParameter);
      expect(parameters[1].props.parameterKey).toEqual('parameterD');
      expect(parameters[1].props.parameter).toEqual(props.connectionParameterSets?.values[0].parameters['parameterD']);
      expect(parameters[1].props.value).toBeUndefined();
      expect(parameters[1].props.setValue).toEqual(expect.any(Function));
    });
  });

  describe('custom credential mapping editor', () => {
    const getConnectionParameterSetsWithCredentialMapping = (): ConnectionParameterSets => ({
      uiDefinition: {
        description: '',
        displayName: '',
      },
      values: [
        {
          name: 'parameterSetA',
          uiDefinition: {
            description: '',
            displayName: 'first parameter set',
          },
          parameters: {
            parameterA: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
                credentialMapping: {
                  mappingName: 'myCredentialMapping',
                  values: [
                    {
                      credentialKeyName: 'myCredentialPasswordKey',
                      type: 'UserPassword',
                    },
                  ],
                },
              },
            },
            parameterB: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
                credentialMapping: {
                  mappingName: 'myCredentialMapping',
                  values: [
                    {
                      credentialKeyName: 'myCredentialUserKey',
                      type: 'UserPassword',
                    },
                  ],
                },
              },
            },
            hiddenParameterC: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
                constraints: {
                  hideInUI: 'true',
                },
              },
            },
            parameterD: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
              },
            },
          },
        },
        {
          name: 'parameterSetB',
          uiDefinition: {
            description: '',
            displayName: 'second parameter set',
          },
          parameters: {
            parameterE: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
                credentialMapping: {
                  mappingName: 'myOtherCredentialMapping',
                  values: [
                    {
                      credentialKeyName: 'myCredentialPasswordKey',
                      type: 'UserPassword',
                    },
                  ],
                },
              },
            },
            parameterF: {
              type: 'string',
              uiDefinition: {
                description: '',
                displayName: '',
                credentialMapping: {
                  mappingName: 'myOtherCredentialMapping',
                  values: [
                    {
                      credentialKeyName: 'myCredentialPasswordKey',
                      type: 'UserPassword',
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    });

    const CustomCredentialMappingEditor = () => <div>Custom CRedential Mapping Editor</div>;

    let connectionParameterEditorService: IConnectionParameterEditorService;
    beforeEach(() => {
      connectionParameterEditorService = {
        getConnectionParameterEditor: jest.fn(),
        getCredentialMappingEditorOptions: jest.fn(({ connectorId }) => {
          if (connectorId !== 'myConnectorId') {
            return undefined;
          }

          return {
            EditorComponent: CustomCredentialMappingEditor,
          };
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      jest.mocked(connectionParameterEditorService.getCredentialMappingEditorOptions!).mockClear();
      InitConnectionParameterEditorService(connectionParameterEditorService);
    });

    afterEach(() => {
      InitConnectionParameterEditorService(undefined);
    });

    it('should not render CustomCredentialMappingEditor when connector has no mapping metadata', () => {
      const connectionParameterSets = getConnectionParameterSets();
      const props: CreateConnectionProps = {
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameterSets,
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);

      expect(connectionParameterEditorService.getCredentialMappingEditorOptions).not.toHaveBeenCalled();

      const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);
      expect(parameters).toHaveLength(2);

      const mappingEditors = findParameterComponents(createConnection, CustomCredentialMappingEditor);
      expect(mappingEditors).toHaveLength(0);
    });

    it('should render CustomCredentialMappingEditor when connector has mapping metadata', () => {
      const connectionParameterSets = getConnectionParameterSetsWithCredentialMapping();
      const props: CreateConnectionProps = {
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameterSets,
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);

      expect(connectionParameterEditorService.getCredentialMappingEditorOptions).toHaveBeenCalledTimes(1);
      expect(connectionParameterEditorService.getCredentialMappingEditorOptions).toHaveBeenLastCalledWith({
        connectorId: 'myConnectorId',
        mappingName: 'myCredentialMapping',
        parameters: {
          parameterA: connectionParameterSets.values[0].parameters['parameterA'],
          parameterB: connectionParameterSets.values[0].parameters['parameterB'],
        },
      });

      const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);
      expect(parameters).toHaveLength(1);
      expect(parameters[0].type).toEqual(UniversalConnectionParameter);
      expect(parameters[0].props.parameterKey).toEqual('parameterD');

      const mappingEditors = findParameterComponents(createConnection, CustomCredentialMappingEditor);
      expect(mappingEditors).toHaveLength(1);
      expect(mappingEditors[0].type).toEqual(CustomCredentialMappingEditor);
      expect(mappingEditors[0].props).toEqual({
        connectorId: 'myConnectorId',
        mappingName: 'myCredentialMapping',
        parameters: {
          parameterA: connectionParameterSets.values[0].parameters['parameterA'],
          parameterB: connectionParameterSets.values[0].parameters['parameterB'],
        },
        setParameterValues: expect.any(Function),
        renderParameter: expect.any(Function),
        isLoading: false,
      });
    });

    it('should render CustomCredentialMappingEditor in loading state', () => {
      const connectionParameterSets = getConnectionParameterSetsWithCredentialMapping();
      const props: CreateConnectionProps = {
        isLoading: true,
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameterSets,
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);
      const mappingEditors = findParameterComponents(createConnection, CustomCredentialMappingEditor);
      expect(mappingEditors).toHaveLength(1);
      expect(mappingEditors[0].type).toEqual(CustomCredentialMappingEditor);
      expect(mappingEditors[0].props.isLoading).toEqual(true);
    });

    it.each([
      [
        'service method returns undefined',
        () => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          jest.mocked(connectionParameterEditorService.getCredentialMappingEditorOptions!).mockReturnValue(undefined);
        },
      ],
      [
        'service method is not implemented',
        () => {
          delete connectionParameterEditorService.getCredentialMappingEditorOptions;
        },
      ],
      [
        'service is not implemented',
        () => {
          InitConnectionParameterEditorService(undefined);
        },
      ],
    ])(`should not render CustomCredentialMappingEditor when %s`, (_, setup) => {
      setup();

      const connectionParameterSets = getConnectionParameterSetsWithCredentialMapping();
      const props: CreateConnectionProps = {
        connectorId: 'myConnectorId',
        connectorDisplayName: 'My Connector',
        connectionParameterSets,
        checkOAuthCallback: jest.fn(),
      };
      renderer.render(<CreateConnection {...props} />);
      const createConnectionContainer = renderer.getRenderOutput();
      const createConnection = findConnectionCreateDiv(createConnectionContainer);

      const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);
      expect(parameters).toHaveLength(3);
      expect(parameters[0].type).toEqual(UniversalConnectionParameter);
      expect(parameters[0].props.parameterKey).toEqual('parameterA');
      expect(parameters[1].type).toEqual(UniversalConnectionParameter);
      expect(parameters[1].props.parameterKey).toEqual('parameterB');
      expect(parameters[2].type).toEqual(UniversalConnectionParameter);
      expect(parameters[2].props.parameterKey).toEqual('parameterD');

      const mappingEditors = findParameterComponents(createConnection, CustomCredentialMappingEditor);
      expect(mappingEditors).toHaveLength(0);
    });

    test('parseParameterValues', () => {
      const parameterValues: Record<string, any> = {
        a: 'foobar',
        b: 42,
        c: null,
        d: undefined,
        e: { foo: 'bar' },
        f: ['id', 66],
      };
      const capabilityEnabledParameters: Record<string, ConnectionParameter> = {
        a: { type: 'connection' },
        z: { type: 'other' },
      };

      const { visibleParameterValues, additionalParameterValues } = parseParameterValues(parameterValues, capabilityEnabledParameters);
      expect(visibleParameterValues).toStrictEqual({ a: 'foobar' });
      expect(additionalParameterValues).toStrictEqual({
        b: 42,
        c: null,
        d: undefined,
        e: { foo: 'bar' },
        f: ['id', 66],
      });

      const emptyParameters = parseParameterValues({}, capabilityEnabledParameters);
      expect(emptyParameters.visibleParameterValues).toStrictEqual({});
      expect(emptyParameters.additionalParameterValues).toBeUndefined();
    });
  });

  function findConnectionCreateDiv(createConnection: ReactElement) {
    return React.Children.toArray(createConnection.props.children).find(
      (child) => (child as ReactElement)?.props.className === 'msla-create-connection-container'
    ) as ReactElement;
  }

  function findConnectionsParamContainer(createConnection: ReactElement) {
    return React.Children.toArray(createConnection.props.children).find(
      (child) => (child as ReactElement)?.props.className === 'connection-params-container'
    ) as ReactElement;
  }

  function findParameterComponents<T>(createConnection: ReactElement, ...components: T[]) {
    const connectionsParamContainer = findConnectionsParamContainer(createConnection);
    return React.Children.toArray(connectionsParamContainer.props.children).filter((child) =>
      components.some((c) => c === (child as ReactElement)?.type)
    ) as ReactElement[];
  }

  function findParameterSetsDropdown(createConnection: ReactElement) {
    const connectionsParamContainer = findConnectionsParamContainer(createConnection);
    for (const paramRow of React.Children.toArray(connectionsParamContainer.props.children)) {
      const testId = (paramRow as ReactElement)?.props?.['data-testId']?.toString();
      if (testId === 'connection-multi-auth-input') {
        return paramRow;
      }
    }
    return undefined;
  }
});
