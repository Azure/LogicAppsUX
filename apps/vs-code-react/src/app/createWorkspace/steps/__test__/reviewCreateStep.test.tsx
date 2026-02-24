import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../../state/createWorkspaceSlice';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => `mock-${String(prop)}`,
      }
    ),
}));

import { ReviewCreateStep } from '../reviewCreateStep';

const createTestStore = (overrides: Partial<CreateWorkspaceState> = {}) => {
  const defaultState: CreateWorkspaceState = {
    currentStep: 1,
    packagePath: { fsPath: '', path: '' },
    workspaceProjectPath: { fsPath: '/home/user/projects', path: '/home/user/projects' },
    workspaceName: 'my-workspace',
    logicAppType: ProjectType.logicApp,
    functionNamespace: '',
    functionName: '',
    functionFolderName: '',
    workflowType: 'Stateful-Codeless',
    workflowName: 'my-workflow',
    targetFramework: '',
    logicAppName: 'my-logic-app',
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
  return render(
    <Provider store={store}>
      <ReviewCreateStep />
    </Provider>
  );
};

describe('ReviewCreateStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace flow', () => {
    it('should render workspace section', () => {
      renderWithStore({ flowType: 'createWorkspace' });
      expect(screen.getByText('my-workspace')).toBeInTheDocument();
    });

    it('should render logic app section', () => {
      renderWithStore({ flowType: 'createWorkspace', logicAppName: 'test-app' });
      expect(screen.getByText('test-app')).toBeInTheDocument();
    });

    it('should render workflow section', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workflowName: 'test-workflow',
        workflowType: 'Stateful-Codeless',
      });
      expect(screen.getByText('test-workflow')).toBeInTheDocument();
    });

    it('should render workspace file and folder paths', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        workspaceProjectPath: { fsPath: '/home/user', path: '/home/user' },
        workspaceName: 'myws',
        separator: '/',
      });
      expect(screen.getByText('/home/user/myws/myws.code-workspace')).toBeInTheDocument();
      expect(screen.getByText('/home/user/myws')).toBeInTheDocument();
    });
  });

  describe('createWorkspaceFromPackage flow', () => {
    it('should render package section', () => {
      renderWithStore({
        flowType: 'createWorkspaceFromPackage',
        packagePath: { fsPath: '/path/to/package.zip', path: '/path/to/package.zip' },
      });
      expect(screen.getByText('/path/to/package.zip')).toBeInTheDocument();
    });

    it('should render workspace section', () => {
      renderWithStore({ flowType: 'createWorkspaceFromPackage' });
      expect(screen.getByText('my-workspace')).toBeInTheDocument();
    });
  });

  describe('convertToWorkspace flow', () => {
    it('should render workspace section', () => {
      renderWithStore({ flowType: 'convertToWorkspace' });
      expect(screen.getByText('my-workspace')).toBeInTheDocument();
    });

    it('should not render workflow section', () => {
      renderWithStore({
        flowType: 'convertToWorkspace',
        workflowName: 'test-workflow',
      });
      // The workflow section heading should not be rendered
      expect(screen.queryByText('Workflow Configuration')).not.toBeInTheDocument();
    });
  });

  describe('createLogicApp flow', () => {
    it('should render logic app section', () => {
      renderWithStore({
        flowType: 'createLogicApp',
        logicAppName: 'test-logic-app',
      });
      expect(screen.getByText('test-logic-app')).toBeInTheDocument();
    });

    it('should not render workspace section', () => {
      renderWithStore({ flowType: 'createLogicApp' });
      // Project Setup section heading should not appear
      expect(screen.queryByText('my-workspace')).not.toBeInTheDocument();
    });
  });

  describe('custom code configuration', () => {
    it('should render custom code section when logicAppType is customCode', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppType: ProjectType.customCode,
        targetFramework: 'net8',
        functionFolderName: 'MyFunctions',
        functionNamespace: 'MyApp.Functions',
        functionName: 'ProcessOrder',
      });
      expect(screen.getByText('Custom Code Configuration')).toBeInTheDocument();
      expect(screen.getByText('MyFunctions')).toBeInTheDocument();
      expect(screen.getByText('MyApp.Functions')).toBeInTheDocument();
      expect(screen.getByText('ProcessOrder')).toBeInTheDocument();
    });

    it('should display dot net framework correctly for net472', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppType: ProjectType.customCode,
        targetFramework: 'net472',
      });
      expect(screen.getByText('.NET Framework')).toBeInTheDocument();
    });

    it('should display dot net framework correctly for net8', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppType: ProjectType.customCode,
        targetFramework: 'net8',
      });
      expect(screen.getByText('.NET 8')).toBeInTheDocument();
    });
  });

  describe('rules engine configuration', () => {
    it('should render function configuration section when logicAppType is rulesEngine', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppType: ProjectType.rulesEngine,
        functionFolderName: 'RulesFunctions',
        functionNamespace: 'MyApp.Rules',
        functionName: 'EvaluateRules',
      });
      expect(screen.getByText('Function Configuration')).toBeInTheDocument();
      expect(screen.getByText('RulesFunctions')).toBeInTheDocument();
      expect(screen.getByText('MyApp.Rules')).toBeInTheDocument();
      expect(screen.getByText('EvaluateRules')).toBeInTheDocument();
    });
  });

  describe('existing logic app handling', () => {
    it('should not render workflow section when using existing logic app for custom code', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        logicAppType: ProjectType.customCode,
        logicAppName: 'existing-app',
        logicAppsWithoutCustomCode: [{ label: 'existing-app' }],
        workflowName: 'should-not-appear',
      });
      expect(screen.queryByText('Workflow Configuration')).not.toBeInTheDocument();
    });
  });

  describe('dev container setting', () => {
    it('should display Yes when dev container is enabled', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        isDevContainerProject: true,
      });
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('should display No when dev container is disabled', () => {
      renderWithStore({
        flowType: 'createWorkspace',
        isDevContainerProject: false,
      });
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });
});
