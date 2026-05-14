import { Platform, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../../state/createWorkspaceSlice';
import { DotNetFrameworkStep } from '../dotNetFrameworkStep';

vi.mock('../../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => `mock-${String(prop)}`,
      }
    ),
}));

describe('DotNetFrameworkStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render .NET 8 for custom code on non-Windows platforms', () => {
    renderWithStore({ logicAppType: ProjectType.customCode, platform: Platform.mac });

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('.NET 8')).toBeInTheDocument();
    expect(screen.queryByText('.NET Framework')).not.toBeInTheDocument();
    expect(screen.queryByText('.NET 10')).not.toBeInTheDocument();
  });

  it('should render .NET Framework before .NET 8 for custom code on Windows', () => {
    renderWithStore({ logicAppType: ProjectType.customCode, platform: Platform.windows });

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('.NET Framework')).toBeInTheDocument();
    expect(screen.getByText('.NET 8')).toBeInTheDocument();
    expect(screen.queryByText('.NET 10')).not.toBeInTheDocument();
  });

  it('should display the selected .NET 8 label and description', () => {
    renderWithStore({ logicAppType: ProjectType.customCode, targetFramework: 'net8' });

    expect(screen.getByRole('combobox')).toHaveTextContent('.NET 8');
    expect(screen.getByText(/latest \.NET 8/i)).toBeInTheDocument();
  });

  it('should dispatch the selected .NET 8 framework', () => {
    const { store } = renderWithStore({ logicAppType: ProjectType.customCode, targetFramework: '' });

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('.NET 8'));

    expect(store.getState().createWorkspace.targetFramework).toBe('net8');
  });

  it('should render nothing for codeless logic app projects', () => {
    const { container } = renderWithStore({ logicAppType: ProjectType.logicApp });

    expect(container).toBeEmptyDOMElement();
  });

  it('should render rules engine function fields without the framework dropdown', () => {
    renderWithStore({
      logicAppType: ProjectType.rulesEngine,
      functionFolderName: 'RulesFolder',
      functionNamespace: 'Contoso.Rules',
      functionName: 'EvaluateRule',
    });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('should validate duplicate function folder names in the workspace file', async () => {
    renderWithStore({
      logicAppType: ProjectType.customCode,
      functionFolderName: 'ExistingFunctions',
      workspaceFileJson: { folders: [{ name: 'ExistingFunctions' }] } as any,
    });

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it('should validate function folder names matching the logic app name', async () => {
    renderWithStore({
      logicAppType: ProjectType.customCode,
      logicAppName: 'SalesLogicApp',
      functionFolderName: 'saleslogicapp',
    });

    expect(await screen.findByText(/same as the logic app/i)).toBeInTheDocument();
  });
});

function renderWithStore(overrides: Partial<CreateWorkspaceState> = {}) {
  const store = configureStore({
    reducer: {
      createWorkspace: createWorkspaceSlice.reducer,
    },
    preloadedState: {
      createWorkspace: {
        currentStep: 1,
        packagePath: { fsPath: '', path: '' },
        workspaceProjectPath: { fsPath: '', path: '' },
        workspaceName: '',
        logicAppType: ProjectType.customCode,
        functionNamespace: 'Contoso.Functions',
        functionName: 'ProcessOrder',
        functionFolderName: 'Functions',
        workflowType: '',
        workflowName: '',
        targetFramework: '',
        logicAppName: 'SalesLogicApp',
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
        platform: Platform.mac,
        isDevContainerProject: false,
        ...overrides,
      },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <DotNetFrameworkStep />
      </Provider>
    ),
  };
}
