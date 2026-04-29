import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { projectSlice } from '../../../state/projectSlice';

// Use vi.hoisted to define mock variables that are used in vi.mock factories
const { mockPostMessage } = vi.hoisted(() => {
  return { mockPostMessage: vi.fn() };
});

// Mock webviewCommunication to avoid acquireVsCodeApi global
vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

// Mock appV2 to render a simple component
vi.mock('../appV2', () => ({
  DesignerApp: () => <div data-testid="designer-v2">Designer V2</div>,
}));

// Mock all heavy dependencies used by DesignerAppV1
vi.mock('../servicesHelper', () => ({
  getDesignerServices: vi.fn(() => ({
    connectionService: {},
    connectorService: {},
    operationManifestService: {},
    searchService: {},
    oAuthService: {},
    gatewayService: {},
    tenantService: {},
    workflowService: { getAgentUrl: vi.fn() },
    hostService: {},
    runService: { getRun: vi.fn().mockResolvedValue(null) },
    roleService: {},
    editorService: {},
    apimService: {},
    loggerService: {},
    connectionParameterEditorService: {},
    cognitiveServiceService: {},
    functionService: {},
  })),
}));

vi.mock('../DesignerCommandBar', () => ({
  DesignerCommandBar: () => null,
}));

vi.mock('../utilities/runInstance', () => ({
  getRunInstanceMocks: vi.fn(),
}));

vi.mock('../utilities/workflow', () => ({
  convertConnectionsDataToReferences: vi.fn(() => ({})),
}));

vi.mock('@microsoft/logic-apps-designer', () => ({
  DesignerProvider: ({ children }: any) => <div>{children}</div>,
  BJSWorkflowProvider: ({ children }: any) => <div>{children}</div>,
  Designer: () => <div data-testid="designer-v1-inner">V1</div>,
  getTheme: vi.fn(() => 'light'),
  useThemeObserver: vi.fn(),
  getReactQueryClient: vi.fn(() => ({ removeQueries: vi.fn() })),
  runsQueriesKeys: {},
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  BundleVersionRequirements: { MULTI_VARIABLE: '1.0.0', NESTED_AGENT_LOOPS: '1.0.0' },
  equals: vi.fn(),
  isEmptyString: vi.fn(() => true),
  isNullOrUndefined: vi.fn(() => true),
  isRuntimeUp: vi.fn(),
  isVersionSupported: vi.fn(() => false),
  Theme: { Dark: 'dark', Light: 'light' },
  InitLoggerService: vi.fn(),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    createFileSystemConnection: 'createFileSystemConnection',
    getDesignerVersion: 'getDesignerVersion',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    refetch: vi.fn(),
    isError: false,
    isFetching: false,
    isLoading: false,
    isRefetching: false,
    data: null,
  })),
  useQueryClient: vi.fn(() => ({})),
}));

vi.mock('@fluentui/react-components', () => ({
  Spinner: () => <div>Loading...</div>,
}));

vi.mock('@microsoft/designer-ui', () => ({
  XLargeText: ({ text }: any) => <div>{text}</div>,
}));

vi.mock('../appStyles', () => ({
  useAppStyles: vi.fn(() => ({})),
}));

vi.mock('../../../intl', () => ({
  useIntlMessages: vi.fn(() => ({ SOMETHING_WENT_WRONG: 'Error', LOADING_DESIGNER: 'Loading' })),
  commonMessages: {},
}));

// Import after mocks
import { DesignerApp } from '../app';

const designerInitialState = {
  panelMetaData: null,
  connectionData: {},
  baseUrl: '/url',
  workflowRuntimeBaseUrl: '',
  apiVersion: '2018-11-01',
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: 'subscriptionId',
    resourceGroup: '',
    location: '',
    tenantId: '',
    httpClient: null,
  },
  readOnly: false,
  isLocal: true,
  isMonitoringView: false,
  callbackInfo: { value: '', method: '' },
  runId: '',
  fileSystemConnections: {},
  iaMapArtifacts: [],
  oauthRedirectUrl: '',
  hostVersion: '',
  isUnitTest: false,
  unitTestDefinition: null,
};

const createTestStore = (designerVersion?: number) => {
  return configureStore({
    reducer: {
      project: projectSlice.reducer,
      designer: createSlice({
        name: 'designer',
        initialState: designerInitialState,
        reducers: {},
      }).reducer,
    },
    preloadedState: {
      project: {
        initialized: true,
        project: 'designer',
        designerVersion,
      },
    },
  });
};

describe('DesignerApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render null when designerVersion is undefined', () => {
    const store = createTestStore(undefined);
    const { container } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('should send getDesignerVersion message on mount', () => {
    const store = createTestStore(undefined);
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(mockPostMessage).toHaveBeenCalledWith({ command: 'getDesignerVersion' });
  });

  it('should render DesignerAppV2 when designerVersion is 2', () => {
    const store = createTestStore(2);
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByTestId('designer-v2')).toBeDefined();
  });

  it('should render DesignerAppV1 when designerVersion is 1', () => {
    const store = createTestStore(1);
    const { container } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    // Should not render V2 or be empty
    expect(container.innerHTML).not.toBe('');
    expect(screen.queryByTestId('designer-v2')).toBeNull();
  });
});
