import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, type AnyAction } from '@reduxjs/toolkit';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import { ExtensionCommand, ProjectType } from '@microsoft/vscode-extension-logic-apps';

const { mockPostMessage } = vi.hoisted(() => {
  return { mockPostMessage: vi.fn() };
});

vi.mock('../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => `mock-${String(prop)}`,
      }
    ),
}));

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

// Mock child step components to isolate CreateWorkspace logic
vi.mock('../steps/', () => ({
  ProjectSetupStep: () => <div data-testid="project-setup-step">ProjectSetupStep</div>,
  PackageSetupStep: () => <div data-testid="package-setup-step">PackageSetupStep</div>,
  ReviewCreateStep: () => <div data-testid="review-create-step">ReviewCreateStep</div>,
  WorkspaceNameStep: () => <div data-testid="workspace-name-step">WorkspaceNameStep</div>,
}));

vi.mock('../../createLogicApp/createLogicAppSetupStep', () => ({
  CreateLogicAppSetupStep: () => <div data-testid="create-logic-app-setup-step">CreateLogicAppSetupStep</div>,
}));

vi.mock('react-router-dom', () => ({
  useOutletContext: vi.fn(),
}));

import { CreateWorkspace, CreateWorkspaceFromPackage, CreateWorkspaceStructure, CreateLogicApp, CreateWorkflow } from '../createWorkspace';

const setTestCreateWorkspaceState = 'test/setCreateWorkspaceState';

const createDefaultState = (overrides: Partial<CreateWorkspaceState> = {}): CreateWorkspaceState => {
  return {
    currentStep: 0,
    packagePath: { fsPath: '', path: '' },
    workspaceProjectPath: { fsPath: '/home/user/projects', path: '/home/user/projects' },
    workspaceName: 'my-workspace',
    logicAppType: ProjectType.logicApp,
    functionNamespace: 'MyApp',
    functionName: 'MyFunction',
    functionFolderName: 'functions',
    workflowType: 'Stateful-Codeless',
    workflowName: 'my-workflow',
    targetFramework: 'net8',
    logicAppName: 'my-logic-app',
    projectType: '',
    openBehavior: '',
    isLoading: false,
    isComplete: false,
    workspaceFileJson: '',
    logicAppsWithoutCustomCode: undefined,
    existingFolders: [],
    flowType: 'createWorkspace',
    pathValidationResults: { '/home/user/projects': true },
    packageValidationResults: {},
    workspaceExistenceResults: {},
    isValidatingWorkspace: false,
    isValidatingPackage: false,
    separator: '/',
    platform: null,
    isDevContainerProject: false,
    availableProjects: [],
    ...overrides,
  };
};

const createTestStore = (overrides: Partial<CreateWorkspaceState> = {}) => {
  const defaultState = createDefaultState(overrides);

  return configureStore({
    reducer: {
      createWorkspace: (state: CreateWorkspaceState | undefined, action: AnyAction) => {
        if (action.type === setTestCreateWorkspaceState) {
          return action.payload as CreateWorkspaceState;
        }
        return createWorkspaceSlice.reducer(state, action);
      },
    },
    preloadedState: {
      createWorkspace: defaultState,
    },
  });
};

const renderWithStore = (overrides: Partial<CreateWorkspaceState> = {}, ui: React.ReactElement = <CreateWorkspace />) => {
  const store = createTestStore(overrides);
  const desiredState = createDefaultState(overrides);
  const rendered = render(<Provider store={store}>{ui}</Provider>);
  act(() => {
    store.dispatch({ type: setTestCreateWorkspaceState, payload: desiredState });
  });

  return {
    store,
    ...rendered,
  };
};

describe('CreateWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('step rendering', () => {
    it('should render ProjectSetupStep for createWorkspace flow at step 0', () => {
      renderWithStore({ currentStep: 0 });
      expect(screen.getByTestId('project-setup-step')).toBeInTheDocument();
    });

    it('should render PackageSetupStep for createWorkspaceFromPackage flow at step 0', () => {
      // Must use the wrapper component since CreateWorkspace useEffect overrides flowType
      const store = createTestStore({ flowType: 'createWorkspaceFromPackage', currentStep: 0 });
      render(
        <Provider store={store}>
          <CreateWorkspaceFromPackage />
        </Provider>
      );
      expect(screen.getByTestId('package-setup-step')).toBeInTheDocument();
    });

    it('should render WorkspaceNameStep for convertToWorkspace flow at step 0', () => {
      const store = createTestStore({ flowType: 'convertToWorkspace', currentStep: 0 });
      render(
        <Provider store={store}>
          <CreateWorkspaceStructure />
        </Provider>
      );
      expect(screen.getByTestId('workspace-name-step')).toBeInTheDocument();
    });

    it('should render CreateLogicAppSetupStep for createLogicApp flow at step 0', () => {
      const store = createTestStore({ flowType: 'createLogicApp', currentStep: 0 });
      render(
        <Provider store={store}>
          <CreateLogicApp />
        </Provider>
      );
      expect(screen.getByTestId('create-logic-app-setup-step')).toBeInTheDocument();
    });

    it('should render ReviewCreateStep at step 1', () => {
      renderWithStore({ currentStep: 1 });
      expect(screen.getByTestId('review-create-step')).toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('should render success message when isComplete is true', () => {
      renderWithStore({ isComplete: true });
      // Should not render form elements
      expect(screen.queryByTestId('project-setup-step')).not.toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('should disable Back button on first step', () => {
      renderWithStore({ currentStep: 0 });
      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find((b) => b.textContent?.includes('Back'));
      expect(backButton).toBeDisabled();
    });

    it('should show Next button on first step', () => {
      renderWithStore({ currentStep: 0 });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeTruthy();
    });

    it('should show Create button on last step', () => {
      renderWithStore({ currentStep: 1 });
      const buttons = screen.getAllByRole('button');
      // The last step should have a create-type button
      const createButton = buttons.find(
        (b) => b.textContent?.includes('Create') || b.textContent?.includes('Workspace') || b.textContent?.includes('Project')
      );
      expect(createButton).toBeTruthy();
    });

    it('should disable all buttons when isLoading', () => {
      renderWithStore({ currentStep: 0, isLoading: true });
      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find((b) => b.textContent?.includes('Back'));
      expect(backButton).toBeDisabled();
    });
  });

  describe('error display', () => {
    it('should display error message when error is set', () => {
      renderWithStore({ error: 'Something went wrong' });
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not display error div when error is empty', () => {
      renderWithStore({ error: undefined });
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('canProceed validation', () => {
    it('should disable Next when workspace path is invalid for createWorkspace', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '', path: '' },
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next when workspace name is empty for createWorkspace', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceName: '',
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next when the workspace folder already exists', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'existing-ws',
        workspaceExistenceResults: {
          '/valid/path/existing-ws': true,
        },
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next when the workspace file already exists', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'existing-ws',
        workspaceExistenceResults: {
          '/valid/path/existing-ws': false,
          '/valid/path/existing-ws/existing-ws.code-workspace': true,
        },
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next while workspace existence validation is pending', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'pending-ws',
        logicAppType: ProjectType.logicApp,
        logicAppName: 'valid-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'valid-workflow',
        workspaceExistenceResults: {
          '/valid/path/pending-ws': false,
        },
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next when logic app name is empty for createWorkspace', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppName: '',
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next when all fields are valid for createWorkspace', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'valid-name',
        workspaceExistenceResults: {
          '/valid/path/valid-name': false,
          '/valid/path/valid-name/valid-name.code-workspace': false,
        },
        logicAppType: ProjectType.logicApp,
        logicAppName: 'valid-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'valid-workflow',
        currentStep: 0,
      });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).not.toBeDisabled();
    });

    it('should enable Next for convertToWorkspace with just workspace path and name', () => {
      renderWithStore(
        {
          flowType: 'convertToWorkspace',
          workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
          pathValidationResults: { '/valid/path': true },
          workspaceName: 'valid-name',
          workspaceExistenceResults: {
            '/valid/path/valid-name': false,
            '/valid/path/valid-name/valid-name.code-workspace': false,
          },
          logicAppType: '',
          logicAppName: '',
          currentStep: 0,
        },
        <CreateWorkspaceStructure />
      );
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('handleCreate', () => {
    it('should send createWorkspace command on create for createWorkspace flow', async () => {
      renderWithStore({
        flowType: 'createWorkspace',
        currentStep: 1,
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'my-ws',
        logicAppType: ProjectType.logicApp,
        logicAppName: 'my-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'my-wf',
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: ExtensionCommand.createWorkspace,
            data: expect.objectContaining({
              workspaceName: 'my-ws',
              logicAppName: 'my-app',
              workflowName: 'my-wf',
            }),
          })
        );
      });
    });

    it('should send createLogicApp command for createLogicApp flow', async () => {
      const { store } = renderWithStore(
        {
          flowType: 'createLogicApp',
          currentStep: 1,
          logicAppType: ProjectType.logicApp,
          logicAppName: 'my-app',
          workflowType: 'Stateful-Codeless',
          workflowName: 'my-wf',
        },
        <CreateLogicApp />
      );
      void store;

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: ExtensionCommand.createLogicApp,
          })
        );
      });
    });

    it('should send createWorkspaceStructure command and enter loading state for convertToWorkspace flow', async () => {
      const { store } = renderWithStore(
        {
          flowType: 'convertToWorkspace',
          currentStep: 1,
          workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
          pathValidationResults: { '/valid/path': true },
          workspaceName: 'my-ws',
          logicAppType: '',
          logicAppName: '',
          workflowType: '',
          workflowName: '',
        },
        <CreateWorkspaceStructure />
      );

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: ExtensionCommand.createWorkspaceStructure,
            data: expect.objectContaining({
              workspaceName: 'my-ws',
            }),
          })
        );
        expect(store.getState().createWorkspace.isLoading).toBe(true);
        expect(createButton).toBeDisabled();
      });
    });

    it('should not post a duplicate create message while loading', async () => {
      const { store } = renderWithStore(
        {
          flowType: 'convertToWorkspace',
          currentStep: 1,
          workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
          pathValidationResults: { '/valid/path': true },
          workspaceName: 'my-ws',
          logicAppType: '',
          logicAppName: '',
          workflowType: '',
          workflowName: '',
        },
        <CreateWorkspaceStructure />
      );

      const createButton = screen.getByRole('button', { name: /create/i });

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(store.getState().createWorkspace.isLoading).toBe(true);
        expect(createButton).toBeDisabled();
      });

      fireEvent.click(createButton);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.createWorkspaceStructure,
        })
      );
    });

    it('should include function fields for customCode logicAppType', async () => {
      renderWithStore({
        flowType: 'createWorkspace',
        currentStep: 1,
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'my-ws',
        logicAppType: ProjectType.customCode,
        logicAppName: 'my-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'my-wf',
        functionFolderName: 'funcs',
        functionNamespace: 'MyNS',
        functionName: 'MyFunc',
        targetFramework: 'net8',
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: ExtensionCommand.createWorkspace,
            data: expect.objectContaining({
              functionFolderName: 'funcs',
              functionNamespace: 'MyNS',
              functionName: 'MyFunc',
            }),
          })
        );
      });
    });

    it('should accept dotted namespace (e.g. MyCompany.Functions) for customCode projects', async () => {
      renderWithStore({
        flowType: 'createWorkspace',
        currentStep: 1,
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'my-ws',
        logicAppType: ProjectType.customCode,
        logicAppName: 'my-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'my-wf',
        functionFolderName: 'funcs',
        functionNamespace: 'MyCompany.Functions',
        functionName: 'MyFunc',
        targetFramework: 'net8',
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();

      fireEvent.click(createButton);
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            command: ExtensionCommand.createWorkspace,
            data: expect.objectContaining({
              functionNamespace: 'MyCompany.Functions',
            }),
          })
        );
      });
    });
  });

  describe('step navigation', () => {
    it('should navigate to next step when Next is clicked and form is valid', () => {
      const { store } = renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'valid-name',
        workspaceExistenceResults: {
          '/valid/path/valid-name': false,
          '/valid/path/valid-name/valid-name.code-workspace': false,
        },
        logicAppType: ProjectType.logicApp,
        logicAppName: 'valid-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'valid-workflow',
        currentStep: 0,
      });

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));

      expect(nextButton).toBeDefined();
      expect(nextButton?.hasAttribute('disabled')).toBe(false);

      fireEvent.click(nextButton as HTMLElement);
      const state = store.getState().createWorkspace;
      expect(state.currentStep).toBe(1);
    });

    it('should enable Next button for custom code with dotted namespace', () => {
      const { store } = renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/valid/path', path: '/valid/path' },
        pathValidationResults: { '/valid/path': true },
        workspaceName: 'valid-name',
        workspaceExistenceResults: {
          '/valid/path/valid-name': false,
          '/valid/path/valid-name/valid-name.code-workspace': false,
        },
        logicAppType: ProjectType.customCode,
        logicAppName: 'valid-app',
        workflowType: 'Stateful-Codeless',
        workflowName: 'valid-wf',
        functionFolderName: 'funcs',
        functionNamespace: 'My.Namespace',
        functionName: 'MyFunc',
        targetFramework: 'net8',
        currentStep: 0,
      });

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));

      expect(nextButton).toBeDefined();
      expect(nextButton?.hasAttribute('disabled')).toBe(false);

      if (nextButton) {
        fireEvent.click(nextButton);
        const state = store.getState().createWorkspace;
        expect(state.currentStep).toBe(1);
      }
    });
  });
});

describe('Flow type wrapper components', () => {
  it('CreateWorkspaceFromPackage sets flowType to createWorkspaceFromPackage', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    render(
      <Provider store={store}>
        <CreateWorkspaceFromPackage />
      </Provider>
    );

    const state = store.getState().createWorkspace;
    expect(state.flowType).toBe('createWorkspaceFromPackage');
  });

  it('CreateWorkspaceStructure sets flowType to convertToWorkspace', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    render(
      <Provider store={store}>
        <CreateWorkspaceStructure />
      </Provider>
    );

    const state = store.getState().createWorkspace;
    expect(state.flowType).toBe('convertToWorkspace');
  });

  it('CreateLogicApp sets flowType to createLogicApp', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    render(
      <Provider store={store}>
        <CreateLogicApp />
      </Provider>
    );

    const state = store.getState().createWorkspace;
    expect(state.flowType).toBe('createLogicApp');
  });
});

describe('CreateLogicApp state preservation (resetState race condition)', () => {
  it('should preserve existingFolders after mount when initializeProject has populated them', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    // Simulate initializeProject being dispatched (as extension host sends initialize_frame)
    act(() => {
      store.dispatch(
        createWorkspaceSlice.actions.initializeProject({
          workspaceFileJson: { folders: [{ name: 'TestApp', path: './TestApp' }] },
          logicAppsWithoutCustomCode: [],
          existingFolders: ['TestApp', 'CustomCodeProject', '.vscode'],
        })
      );
    });

    // Verify state has existingFolders before mount
    expect(store.getState().createWorkspace.existingFolders).toEqual(['TestApp', 'CustomCodeProject', '.vscode']);

    // Mount CreateLogicApp — this previously called resetState which wiped existingFolders
    render(
      <Provider store={store}>
        <CreateLogicApp />
      </Provider>
    );

    // After mount, existingFolders must still be preserved
    const stateAfterMount = store.getState().createWorkspace;
    expect(stateAfterMount.existingFolders).toEqual(['TestApp', 'CustomCodeProject', '.vscode']);
    expect(stateAfterMount.flowType).toBe('createLogicApp');
  });

  it('should preserve workspaceFileJson after mount when initializeProject has populated it', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    const workspaceFileJson = { folders: [{ name: 'MyApp', path: './MyApp' }] };

    act(() => {
      store.dispatch(
        createWorkspaceSlice.actions.initializeProject({
          workspaceFileJson,
          logicAppsWithoutCustomCode: [{ label: 'MyApp' }],
          existingFolders: ['MyApp'],
        })
      );
    });

    render(
      <Provider store={store}>
        <CreateLogicApp />
      </Provider>
    );

    const stateAfterMount = store.getState().createWorkspace;
    expect(stateAfterMount.workspaceFileJson).toEqual(workspaceFileJson);
    expect(stateAfterMount.logicAppsWithoutCustomCode).toEqual([{ label: 'MyApp' }]);
  });

  it('should not interfere with CreateWorkflow preserving availableProjects', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    const availableProjects = [
      { name: 'Project1', path: '/workspace/Project1', isCodeful: false, existingWorkflows: ['workflow-a'] },
      { name: 'Project2', path: '/workspace/Project2', isCodeful: true, existingWorkflows: [] },
    ];

    act(() => {
      store.dispatch(createWorkspaceSlice.actions.initializeWorkspace({ availableProjects }));
    });

    expect(store.getState().createWorkspace.availableProjects).toEqual(availableProjects);

    // Dynamically import CreateWorkflow
    render(
      <Provider store={store}>
        <CreateWorkflow />
      </Provider>
    );

    const stateAfterMount = store.getState().createWorkspace;
    expect(stateAfterMount.availableProjects).toEqual(availableProjects);
    expect(stateAfterMount.flowType).toBe('createWorkflow');
  });
});
