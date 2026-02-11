import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { IntlProvider } from 'react-intl';

// Mock the V2 designer app
vi.mock('../appV2', () => ({
  DesignerApp: () => React.createElement('div', { 'data-testid': 'designer-v2' }, 'Designer V2'),
}));

// Mock servicesHelper
vi.mock('../servicesHelper', () => ({
  getDesignerServices: vi.fn(() => ({
    connectionService: {},
    operationManifestService: {},
    searchService: {},
    workflowService: { getAgentUrl: undefined },
    runService: { getRun: vi.fn() },
    hostService: {},
    oAuthService: {},
  })),
}));

// Mock appStyles
vi.mock('../appStyles', () => ({
  useAppStyles: vi.fn(() => ({ designerError: '', designerLoading: '' })),
}));

// Mock intl
vi.mock('../../../intl', () => ({
  useIntlMessages: vi.fn(() => ({
    SOMETHING_WENT_WRONG: 'Something went wrong',
    LOADING_DESIGNER: 'Loading designer',
  })),
  commonMessages: {},
}));

// Mock designer-ui
vi.mock('@microsoft/designer-ui', () => ({
  XLargeText: ({ text }: { text: string }) => React.createElement('div', null, text),
}));

// Mock fluent
vi.mock('@fluentui/react-components', () => ({
  Spinner: ({ label }: { label: string }) => React.createElement('div', null, label),
  makeStyles: vi.fn(() => vi.fn(() => ({}))),
}));

// Mock DesignerCommandBar
vi.mock('../DesignerCommandBar', () => ({
  DesignerCommandBar: () => React.createElement('div', { 'data-testid': 'command-bar' }, 'CommandBar'),
}));

// Mock designer library
vi.mock('@microsoft/logic-apps-designer', () => ({
  DesignerProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  BJSWorkflowProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Designer: () => React.createElement('div', { 'data-testid': 'designer-v1' }, 'Designer V1'),
  getTheme: vi.fn(() => 'light'),
  useThemeObserver: vi.fn(),
  getReactQueryClient: vi.fn(() => ({ removeQueries: vi.fn() })),
  runsQueriesKeys: {
    useRunInstance: 'useRunInstance',
    useActionsChatHistory: 'useActionsChatHistory',
    useRunChatHistory: 'useRunChatHistory',
    useAgentActionsRepetition: 'useAgentActionsRepetition',
    useAgentRepetition: 'useAgentRepetition',
    useNodeRepetition: 'useNodeRepetition',
  },
  store: { dispatch: vi.fn() },
  resetDesignerDirtyState: vi.fn(),
}));

// Mock shared
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    BundleVersionRequirements: { MULTI_VARIABLE: '1.0', NESTED_AGENT_LOOPS: '1.0' },
    equals: vi.fn(),
    isEmptyString: vi.fn(() => true),
    isNullOrUndefined: vi.fn(() => true),
    isRuntimeUp: vi.fn(() => Promise.resolve(false)),
    isVersionSupported: vi.fn(() => false),
    Theme: { Dark: 'dark', Light: 'light' },
  };
});

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    refetch: vi.fn(),
    isError: false,
    isFetching: false,
    isLoading: false,
    isRefetching: false,
    data: null,
  })),
  useQueryClient: vi.fn(() => ({ removeQueries: vi.fn() })),
}));

// Mock vscode-extension-logic-apps
vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    createFileSystemConnection: 'createFileSystemConnection',
    getDesignerVersion: 'getDesignerVersion',
    initialize: 'initialize',
    initialize_frame: 'initialize_frame',
  },
  HttpClient: vi.fn().mockImplementation(() => ({})),
}));

// Mock utilities
vi.mock('../utilities/runInstance', () => ({
  getRunInstanceMocks: vi.fn(),
}));
vi.mock('../utilities/workflow', () => ({
  convertConnectionsDataToReferences: vi.fn(() => ({})),
}));

// Mock use-it/event-listener
vi.mock('@use-it/event-listener', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import { projectSlice } from '../../../state/projectSlice';
import { designerSlice } from '../../../state/DesignerSlice';

import { DesignerApp } from '../app';

const createTestStore = (designerVersion?: number) => {
  return configureStore({
    reducer: {
      project: projectSlice.reducer,
      designer: designerSlice.reducer,
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
        <IntlProvider locale="en">
          <DesignerApp />
        </IntlProvider>
      </Provider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render V2 designer when designerVersion is 2', () => {
    const store = createTestStore(2);
    const { getByTestId } = render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <DesignerApp />
        </IntlProvider>
      </Provider>
    );
    expect(getByTestId('designer-v2')).toBeDefined();
  });

  it('should render V1 designer when designerVersion is 1', () => {
    const store = createTestStore(1);
    const { container } = render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <DesignerApp />
        </IntlProvider>
      </Provider>
    );
    // V1 component renders some content
    expect(container.innerHTML).not.toBe('');
  });
});
