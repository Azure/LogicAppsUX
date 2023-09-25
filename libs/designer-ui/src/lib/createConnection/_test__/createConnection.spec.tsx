import { CreateConnection, type CreateConnectionProps } from '..';
import { UniversalConnectionParameter } from '../universalConnectionParameter';
import type { IDropdownProps } from '@fluentui/react';
import {
  InitConnectionParameterEditorService,
  type IConnectionParameterEditorService,
  type IConnectionParameterInfo,
} from '@microsoft/designer-client-services-logic-apps';
import type { ConnectionParameter, ConnectionParameterSets } from '@microsoft/utils-logic-apps';
import React, { type ReactElement } from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/createConnection', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

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
    const createConnection = renderer.getRenderOutput();

    expect(createConnection.type).toEqual('div');
    expect(createConnection.props.className).toEqual('msla-create-connection-container');
    expect(React.Children.toArray(createConnection.props.children)).not.toHaveLength(0);

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
    const createConnection = renderer.getRenderOutput();
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
    const createConnection = renderer.getRenderOutput();

    const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
    expect(parameterSetsDropdown).toBeDefined();
    expect(parameterSetsDropdown?.props.options).toHaveLength(2);
    expect(parameterSetsDropdown?.props.options[0].text).toEqual('first parameter set');
    expect(parameterSetsDropdown?.props.options[1].text).toEqual('second parameter set');
    expect(parameterSetsDropdown?.props.selectedKey).toEqual(0);

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
      const createConnection = renderer.getRenderOutput();
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
      const createConnection = renderer.getRenderOutput();

      const parameterSetsDropdown = findParameterSetsDropdown(createConnection);
      expect(parameterSetsDropdown?.props.selectedKey).toEqual(0);

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
      for (const child of React.Children.toArray((paramRow as ReactElement).props.children)) {
        if ((child as ReactElement)?.props.id === 'connection-param-set-select') {
          return child as ReactElement<IDropdownProps>;
        }
      }
    }

    return undefined;
  }
});
