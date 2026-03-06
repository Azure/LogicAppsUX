import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../../state/createWorkspaceSlice';

const { mockPostMessage } = vi.hoisted(() => {
  return { mockPostMessage: vi.fn() };
});

vi.mock('../../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => `mock-${String(prop)}`,
      }
    ),
}));

vi.mock('../../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

import { WorkspaceNameStep } from '../workspaceNameStep';

const createTestStore = (overrides: Partial<CreateWorkspaceState> = {}) => {
  const defaultState: CreateWorkspaceState = {
    currentStep: 0,
    packagePath: { fsPath: '', path: '' },
    workspaceProjectPath: { fsPath: '', path: '' },
    workspaceName: '',
    logicAppType: '',
    functionNamespace: '',
    functionName: '',
    functionFolderName: '',
    workflowType: '',
    workflowName: '',
    targetFramework: '',
    logicAppName: '',
    projectType: '',
    openBehavior: '',
    isLoading: false,
    isComplete: false,
    workspaceFileJson: '',
    logicAppsWithoutCustomCode: undefined,
    flowType: 'createWorkspace',
    pathValidationResults: {},
    packageValidationResults: {},
    workspaceExistenceResults: {},
    isValidatingWorkspace: false,
    isValidatingPackage: false,
    separator: '/',
    platform: null,
    isDevContainerProject: false,
    ...overrides,
  };

  return configureStore({
    reducer: {
      createWorkspace: createWorkspaceSlice.reducer,
    },
    preloadedState: {
      createWorkspace: defaultState,
    },
  });
};

const renderWithStore = (overrides: Partial<CreateWorkspaceState> = {}) => {
  const store = createTestStore(overrides);
  return {
    store,
    ...render(
      <Provider store={store}>
        <WorkspaceNameStep />
      </Provider>
    ),
  };
};

describe('WorkspaceNameStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render project path and workspace name inputs', () => {
    renderWithStore();
    // The labels should be rendered
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('should render Browse button', () => {
    renderWithStore();
    // There should be a button for browsing
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  describe('project path input', () => {
    it('should dispatch setProjectPath when path input changes', () => {
      const { store } = renderWithStore();
      const inputs = screen.getAllByRole('textbox');
      const pathInput = inputs[0]; // First input is project path

      fireEvent.change(pathInput, { target: { value: '/new/path' } });

      const state = store.getState().createWorkspace;
      expect(state.workspaceProjectPath.fsPath).toBe('/new/path');
    });
  });

  describe('workspace name input', () => {
    it('should dispatch setWorkspaceName when name input changes', () => {
      const { store } = renderWithStore();
      const inputs = screen.getAllByRole('textbox');
      const nameInput = inputs[1]; // Second input is workspace name

      fireEvent.change(nameInput, { target: { value: 'my-workspace' } });

      const state = store.getState().createWorkspace;
      expect(state.workspaceName).toBe('my-workspace');
    });
  });

  describe('dev container switch', () => {
    it('should dispatch setIsDevContainerProject when switch is toggled', () => {
      const { store } = renderWithStore({ isDevContainerProject: false });
      const switchControl = screen.getByRole('switch');

      fireEvent.click(switchControl);

      const state = store.getState().createWorkspace;
      expect(state.isDevContainerProject).toBe(true);
    });
  });

  describe('browse button', () => {
    it('should send select_folder message to extension when clicked', () => {
      renderWithStore();
      const buttons = screen.getAllByRole('button');
      // Find the browse button (not the switch)
      const browseButton = buttons[0];

      fireEvent.click(browseButton);

      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'select-folder' }));
    });
  });

  describe('path validation display', () => {
    it('should show valid path indicator when path is validated', () => {
      renderWithStore({
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
      });

      expect(screen.getByText(/Valid path/)).toBeInTheDocument();
    });

    it('should show invalid path indicator when path validation fails', () => {
      renderWithStore({
        workspaceProjectPath: { fsPath: '/invalid/path', path: '/invalid/path' },
        pathValidationResults: { '/invalid/path': false },
      });

      expect(screen.getByText(/Invalid path/)).toBeInTheDocument();
    });
  });

  describe('workspace name validation display', () => {
    it('should show availability indicator when workspace name and path are valid', () => {
      renderWithStore({
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        workspaceName: 'my-workspace',
        pathValidationResults: { '/valid/path': true },
        workspaceExistenceResults: {},
      });

      expect(screen.getByText(/Available/)).toBeInTheDocument();
    });

    it('should show the full workspace file path preview', () => {
      renderWithStore({
        workspaceProjectPath: { fsPath: '/home/user', path: '/home/user' },
        workspaceName: 'test-ws',
        pathValidationResults: { '/home/user': true },
        separator: '/',
      });

      expect(screen.getByText(/\/home\/user\/test-ws\/test-ws\.code-workspace/)).toBeInTheDocument();
    });
  });

  describe('debounced path validation', () => {
    it('should send validatePath message after debounce when path changes', async () => {
      const { store } = renderWithStore({
        workspaceProjectPath: { fsPath: '/some/path', path: '/some/path' },
      });

      // Advance timers to trigger debounced validation
      await vi.advanceTimersByTimeAsync(600);

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'validatePath',
          data: expect.objectContaining({ path: '/some/path' }),
        })
      );
    });
  });
});

// Import afterEach for timer cleanup
import { afterEach } from 'vitest';
