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
import type { ConnectionParameter, ConnectionParameterSets, Connector } from '@microsoft/logic-apps-shared';
import React, { type ReactElement } from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import {
  mockConnectionParameters,
  mockConnectionParameterSets,
  mockOauthWithTenantParameters,
  mockParameterSetsWithCredentialMapping,
} from './mocks/connectionParameters';

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  isTenantServiceEnabled: () => true,
}));

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
      readConnections: vi.fn(),
    })
  );

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  const baseConnector: Connector = {
    id: 'myConnectorId',
    type: 'connector',
    name: 'myConnector',
    properties: {
      iconUri: 'https://iconUri',
      displayName: 'My Connector',
      capabilities: ['generic'],
    },
  };

  const connectorWithParameters: Connector = {
    ...baseConnector,
    properties: {
      ...baseConnector.properties,
      connectionParameters: mockConnectionParameters,
    },
  };

  it('should render the create connection component', () => {
    const props: CreateConnectionProps = {
      connector: baseConnector,
      checkOAuthCallback: vi.fn(),
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
      connector: connectorWithParameters,
      checkOAuthCallback: vi.fn(),
    };
    renderer.render(<CreateConnection {...props} />);
    const createConnectionContainer = renderer.getRenderOutput();
    const createConnection = findConnectionCreateDiv(createConnectionContainer);
    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    const parameters = findParameterComponents(createConnection, UniversalConnectionParameter);

    expect(parameterSetsDropdown).toBeUndefined();
    expect(parameters).toHaveLength(2);

    expect(parameters[0].props.parameterKey).toEqual('parameterA');
    expect(parameters[0].props.parameter).toEqual(props.connector.properties.connectionParameters?.['parameterA']);
    expect(parameters[0].props.value).toBeUndefined();
    expect(parameters[0].props.setValue).toEqual(expect.any(Function));

    expect(parameters[1].props.parameterKey).toEqual('parameterD');
    expect(parameters[1].props.parameter).toEqual(props.connector.properties.connectionParameters?.['parameterD']);
    expect(parameters[1].props.value).toBeUndefined();
    expect(parameters[1].props.setValue).toEqual(expect.any(Function));
  });

  it('should render oauth with tenant selection', () => {
    const props: CreateConnectionProps = {
      connector: {
        ...baseConnector,
        properties: {
          ...baseConnector.properties,
          connectionParameters: mockOauthWithTenantParameters,
        },
      },
      checkOAuthCallback: vi.fn(),
    };
    renderer.render(<CreateConnection {...props} />);
    const createConnectionContainer = renderer.getRenderOutput();
    const createConnection = findConnectionCreateDiv(createConnectionContainer);

    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    expect(parameterSetsDropdown).toBeUndefined();

    const legacyMultiAuth = findLegacyMultiAuth(createConnection);
    expect(legacyMultiAuth).toBeDefined();

    const tenantPicker = findTenantPicker(createConnection);
    expect(tenantPicker).toBeDefined();
  });

  it('should render connectionParameterSet dropdown and parameters', () => {
    const props: CreateConnectionProps = {
      connector: baseConnector,
      connectionParameterSets: mockConnectionParameterSets,
      checkOAuthCallback: vi.fn(),
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
      getConnectionParameterEditor: vi.fn(({ parameterKey }: IConnectionParameterInfo) => {
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
        connector: connectorWithParameters,
        checkOAuthCallback: vi.fn(),
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
      expect(parameters[0].props.parameter).toEqual(props.connector.properties.connectionParameters?.['parameterA']);
      expect(parameters[0].props.value).toBeUndefined();
      expect(parameters[0].props.setValue).toEqual(expect.any(Function));

      expect(parameters[1].type).toEqual(UniversalConnectionParameter);
      expect(parameters[1].props.parameterKey).toEqual('parameterD');
      expect(parameters[1].props.parameter).toEqual(props.connector.properties.connectionParameters?.['parameterD']);
      expect(parameters[1].props.value).toBeUndefined();
      expect(parameters[1].props.setValue).toEqual(expect.any(Function));
    });

    it('should support custom parameter editor for connectionParameters in connectionParameterSet', () => {
      const CustomConnectionParameter = () => <div>Custom Connection Parameter</div>;

      const connectionParameterEditorService: IConnectionParameterEditorService = {
        getConnectionParameterEditor: vi.fn(({ parameterKey }) => {
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
        connector: baseConnector,
        connectionParameterSets: mockConnectionParameterSets,
        checkOAuthCallback: vi.fn(),
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
    const CustomCredentialMappingEditor = () => <div>Custom CRedential Mapping Editor</div>;

    let connectionParameterEditorService: IConnectionParameterEditorService;
    beforeEach(() => {
      connectionParameterEditorService = {
        getConnectionParameterEditor: vi.fn(),
        getCredentialMappingEditorOptions: vi.fn(({ connectorId }) => {
          if (connectorId !== 'myConnectorId') {
            return undefined;
          }

          return {
            EditorComponent: CustomCredentialMappingEditor,
          };
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      vi.mocked(connectionParameterEditorService.getCredentialMappingEditorOptions!).mockClear();
      InitConnectionParameterEditorService(connectionParameterEditorService);
    });

    afterEach(() => {
      InitConnectionParameterEditorService(undefined);
    });

    it('should not render CustomCredentialMappingEditor when connector has no mapping metadata', () => {
      const props: CreateConnectionProps = {
        connector: baseConnector,
        connectionParameterSets: mockConnectionParameterSets,
        checkOAuthCallback: vi.fn(),
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
      const connectionParameterSets = mockParameterSetsWithCredentialMapping;
      const props: CreateConnectionProps = {
        connector: baseConnector,
        connectionParameterSets,
        checkOAuthCallback: vi.fn(),
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
      const props: CreateConnectionProps = {
        isLoading: true,
        connector: baseConnector,
        connectionParameterSets: mockParameterSetsWithCredentialMapping,
        checkOAuthCallback: vi.fn(),
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
          vi.mocked(connectionParameterEditorService.getCredentialMappingEditorOptions!).mockReturnValue(undefined);
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

      const props: CreateConnectionProps = {
        connector: baseConnector,
        connectionParameterSets: mockParameterSetsWithCredentialMapping,
        checkOAuthCallback: vi.fn(),
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

  function findLegacyMultiAuth(createConnection: ReactElement) {
    const connectionsParamContainer = findConnectionsParamContainer(createConnection);
    for (const paramRow of React.Children.toArray(connectionsParamContainer.props.children)) {
      const testId = (paramRow as ReactElement)?.props?.['data-testId']?.toString();
      if (testId === 'legacy-multi-auth') {
        return paramRow;
      }
    }
    return undefined;
  }

  function findTenantPicker(createConnection: ReactElement) {
    const connectionsParamContainer = findConnectionsParamContainer(createConnection);
    for (const paramRow of React.Children.toArray(connectionsParamContainer.props.children)) {
      const testId = (paramRow as ReactElement)?.props?.['data-testId']?.toString();
      if (testId === 'connection-param-oauth-tenants') {
        return paramRow;
      }
    }
    return undefined;
  }
});
