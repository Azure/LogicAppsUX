import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { VSCodeContext } from '../../../webviewCommunication';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { designerSlice, updateFileSystemConnection } from '../../../state/DesignerSlice';
import { LanguageServerConnectionView } from '../connectionView';
import { initializeLanguageServer, languageServerSlice } from '../../../state/LanguageServerSlice';

const mocks = vi.hoisted(() => ({
  getDesignerServices: vi.fn(),
}));

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: vi.fn() }),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn() }),
}));

vi.mock('../connectionViewStyles', () => ({
  useConnectionViewStyles: () => ({
    connectionViewContainer: 'connection-view-container',
  }),
}));

vi.mock('../../designer/servicesHelper', () => ({
  getDesignerServices: mocks.getDesignerServices,
}));

vi.mock('../../designer/utilities/workflow', () => ({
  convertConnectionsDataToReferences: vi.fn(() => ({ connectionReference: { connectionName: 'managed' } })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  Theme: {
    Dark: 'dark',
    Light: 'light',
  },
  getRecordEntry: (record: Record<string, string>, key: string) => record[key],
  isArmResourceId: (id: string) => id.startsWith('/subscriptions/'),
}));

vi.mock('@microsoft/logic-apps-designer', () => ({
  BJSWorkflowProvider: ({ children }: any) => <div data-testid="workflow-provider">{children}</div>,
  ConnectionsView: ({ closeView, onConnectionSuccessful }: any) => (
    <div>
      <button onClick={closeView} type="button">
        Close
      </button>
      <button
        onClick={() =>
          onConnectionSuccessful({
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/managed',
            name: 'managed',
          })
        }
        type="button"
      >
        Managed success
      </button>
      <button onClick={() => onConnectionSuccessful({ id: 'local-connection', name: 'local' })} type="button">
        Local success
      </button>
    </div>
  ),
  DesignerProvider: ({ children }: any) => <div data-testid="designer-provider">{children}</div>,
  getTheme: () => 'light',
  store: {
    getState: () => ({
      connections: {
        connectionReferences: {
          referenceOne: { connectionName: 'managed' },
        },
        connectionsMapping: {
          nodeOne: 'referenceOne',
        },
      },
    }),
  },
  useThemeObserver: vi.fn(),
}));

function createStore() {
  const store = configureStore({
    reducer: {
      designer: designerSlice.reducer,
      languageServer: languageServerSlice.reducer,
    },
  });

  store.dispatch(
    initializeLanguageServer({
      apiHubServiceDetails: { subscriptionId: 'sub' },
      apiVersion: '2024-01-01',
      baseUrl: 'https://management.azure.com',
      connectionData: { managedApiConnections: {} },
      connector: {
        currentConnectionId: 'current',
        name: 'filesystem',
        type: 'serviceProvider',
      },
      hostVersion: '4.0',
      oauthRedirectUrl: 'https://redirect',
      panelMetadata: {
        localSettings: {},
        parametersData: {},
      },
      workflowRuntimeBaseUrl: 'http://localhost:7071',
    })
  );

  return store;
}

function renderConnectionView() {
  const postMessage = vi.fn();
  const store = createStore();

  render(
    <VSCodeContext.Provider value={{ postMessage }}>
      <Provider store={store}>
        <LanguageServerConnectionView />
      </Provider>
    </VSCodeContext.Provider>
  );

  return { postMessage, store };
}

describe('LanguageServerConnectionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDesignerServices.mockReturnValue({});
  });

  it('posts close and managed insert messages to the extension host', () => {
    const { postMessage } = renderConnectionView();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Managed success' }));

    expect(postMessage).toHaveBeenCalledWith({ command: ExtensionCommand.close_panel });
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.insert_connection,
      connection: {
        id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/managed',
        name: 'managed',
      },
      connectionReferences: {
        referenceOne: { connectionName: 'managed' },
      },
    });
  });

  it('captures local addConnection data and sends it with the insert message', () => {
    const { postMessage } = renderConnectionView();
    const wrappedVscode = mocks.getDesignerServices.mock.calls[0][9];

    wrappedVscode.postMessage({
      command: ExtensionCommand.addConnection,
      connectionAndSetting: { appSettingName: 'AzureWebJobsStorage' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Local success' }));

    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.insert_connection,
      connection: { id: 'local-connection', name: 'local' },
      connectionAndSetting: { appSettingName: 'AzureWebJobsStorage' },
    });
  });

  it('creates file system connection requests through the language server slice', async () => {
    const { postMessage, store } = renderConnectionView();
    const createFileSystemConnection = mocks.getDesignerServices.mock.calls[0][8];

    const pendingConnection = createFileSystemConnection({ rootFolder: '/tmp' }, 'share');

    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.createFileSystemConnection,
      connectionInfo: { rootFolder: '/tmp' },
      connectionName: 'share',
    });
    expect(store.getState().designer.fileSystemConnections.share).toBeDefined();

    store.dispatch(updateFileSystemConnection({ connectionName: 'share', connection: { id: 'share' }, error: '' }));

    await expect(pendingConnection).resolves.toEqual({ id: 'share' });
  });
});
