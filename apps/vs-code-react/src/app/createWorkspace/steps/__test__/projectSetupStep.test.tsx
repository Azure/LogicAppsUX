import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSetupStep } from '../projectSetupStep';

vi.mock('../../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () => ({ formSection: 'form-section' }),
}));

vi.mock('../workspaceNameStep', () => ({
  WorkspaceNameStep: () => <div data-testid="workspace-name-step" />,
}));

vi.mock('../logicAppTypeStep', () => ({
  LogicAppTypeStep: () => <div data-testid="logic-app-type-step" />,
}));

vi.mock('../dotNetFrameworkStep', () => ({
  DotNetFrameworkStep: () => <div data-testid="dotnet-framework-step" />,
}));

vi.mock('../workflowTypeStep', () => ({
  WorkflowTypeStep: () => <div data-testid="workflow-type-step" />,
}));

function renderProjectSetup(logicAppType: ProjectType) {
  const store = configureStore({
    reducer: {
      createWorkspace: () => ({ logicAppType }),
    },
  });

  return render(
    <Provider store={store}>
      <ProjectSetupStep />
    </Provider>
  );
}

describe('ProjectSetupStep', () => {
  it('renders the base workspace, logic app, and workflow steps', () => {
    renderProjectSetup(ProjectType.logicApp);

    expect(screen.getByTestId('workspace-name-step')).toBeInTheDocument();
    expect(screen.getByTestId('logic-app-type-step')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-type-step')).toBeInTheDocument();
    expect(screen.queryByTestId('dotnet-framework-step')).not.toBeInTheDocument();
  });

  it('renders the .NET framework step for custom code projects', () => {
    renderProjectSetup(ProjectType.customCode);

    expect(screen.getByTestId('dotnet-framework-step')).toBeInTheDocument();
  });

  it('renders the .NET framework step for rules engine projects', () => {
    renderProjectSetup(ProjectType.rulesEngine);

    expect(screen.getByTestId('dotnet-framework-step')).toBeInTheDocument();
  });
});
