import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

import { DotNetFrameworkStep } from '../dotNetFrameworkStep';

const createTestStore = (overrides: Partial<CreateWorkspaceState> = {}) => {
  const defaultState: CreateWorkspaceState = {
    currentStep: 1,
    packagePath: { fsPath: '', path: '' },
    workspaceProjectPath: { fsPath: '', path: '' },
    workspaceName: '',
    logicAppType: ProjectType.customCode,
    functionNamespace: 'TestNamespace',
    functionName: 'TestFunction',
    functionFolderName: 'TestFolder',
    workflowType: '',
    workflowName: '',
    targetFramework: '',
    logicAppName: 'TestLogicApp',
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
        <DotNetFrameworkStep />
      </Provider>
    ),
  };
};

describe('DotNetFrameworkStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering for customCode project type', () => {
    it('should render the dotnet version dropdown', () => {
      renderWithStore({ logicAppType: ProjectType.customCode });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render .NET 8 and .NET 10 options on non-Windows', () => {
      renderWithStore({ logicAppType: ProjectType.customCode, platform: null });
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      expect(screen.getByText('.NET 8')).toBeInTheDocument();
      expect(screen.getByText('.NET 10')).toBeInTheDocument();
    });

    it('should also render .NET Framework option on Windows', () => {
      renderWithStore({ logicAppType: ProjectType.customCode, platform: 'win32' as any });
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      expect(screen.getByText('.NET Framework')).toBeInTheDocument();
      expect(screen.getByText('.NET 8')).toBeInTheDocument();
      expect(screen.getByText('.NET 10')).toBeInTheDocument();
    });

    it('should not render .NET Framework option on non-Windows', () => {
      renderWithStore({ logicAppType: ProjectType.customCode, platform: 'darwin' as any });
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      expect(screen.queryByText('.NET Framework')).not.toBeInTheDocument();
    });
  });

  describe('selected framework display', () => {
    it('should show .NET 10 label when net10.0 is selected', () => {
      renderWithStore({
        logicAppType: ProjectType.customCode,
        targetFramework: 'net10.0',
      });
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent('.NET 10');
    });

    it('should show .NET 8 label when net8 is selected', () => {
      renderWithStore({
        logicAppType: ProjectType.customCode,
        targetFramework: 'net8',
      });
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent('.NET 8');
    });

    it('should show description text when a framework is selected', () => {
      renderWithStore({
        logicAppType: ProjectType.customCode,
        targetFramework: 'net10.0',
      });
      // Description text should appear below the dropdown
      expect(screen.getByText(/modern development and performance/)).toBeInTheDocument();
    });
  });

  describe('non-customCode project types', () => {
    it('should return null for logicApp project type', () => {
      const { container } = renderWithStore({ logicAppType: ProjectType.logicApp });
      expect(container.querySelector('[role="combobox"]')).toBeNull();
    });
  });

  describe('rules engine project type', () => {
    it('should render function configuration fields for rulesEngine', () => {
      renderWithStore({
        logicAppType: ProjectType.rulesEngine,
        functionFolderName: 'RulesFolder',
        functionNamespace: 'Rules.Namespace',
        functionName: 'EvalRule',
      });
      // Rules engine renders inputs but no dotnet version dropdown
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    });
  });

  describe('framework selection dispatch', () => {
    it('should dispatch setTargetFramework when an option is selected', () => {
      const { store } = renderWithStore({
        logicAppType: ProjectType.customCode,
        targetFramework: '',
      });

      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);

      const net10Option = screen.getByText('.NET 10');
      fireEvent.click(net10Option);

      const state = store.getState().createWorkspace;
      expect(state.targetFramework).toBe('net10.0');
    });
  });
});
