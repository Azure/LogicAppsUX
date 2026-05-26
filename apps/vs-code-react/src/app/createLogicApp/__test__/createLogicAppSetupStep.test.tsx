import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CreateLogicAppSetupStep } from '../createLogicAppSetupStep';

vi.mock('../../createWorkspace/createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () => ({ formSection: 'form-section' }),
}));

vi.mock('../../createWorkspace/steps/logicAppTypeStep', () => ({
  LogicAppTypeStep: () => <div data-testid="logic-app-type-step" />,
}));

vi.mock('../../createWorkspace/steps/dotNetFrameworkStep', () => ({
  DotNetFrameworkStep: () => <div data-testid="dotnet-framework-step" />,
}));

vi.mock('../../createWorkspace/steps/workflowTypeStep', () => ({
  WorkflowTypeStep: () => <div data-testid="workflow-type-step" />,
}));

function renderSetup(logicAppType = ProjectType.logicApp, logicAppName = 'new-app') {
  const store = configureStore({
    reducer: {
      createWorkspace: () => ({
        logicAppName,
        logicAppType,
        logicAppsWithoutCustomCode: [{ label: 'existing-app' }],
      }),
    },
  });

  return render(
    <Provider store={store}>
      <CreateLogicAppSetupStep />
    </Provider>
  );
}

describe('CreateLogicAppSetupStep', () => {
  it('shows workflow type for a new logic app', () => {
    renderSetup(ProjectType.logicApp, 'new-app');

    expect(screen.getByTestId('logic-app-type-step')).toBeInTheDocument();
    expect(screen.getByTestId('dotnet-framework-step')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-type-step')).toBeInTheDocument();
  });

  it('hides workflow type when adding custom code to an existing logic app', () => {
    renderSetup(ProjectType.customCode, 'existing-app');

    expect(screen.getByTestId('logic-app-type-step')).toBeInTheDocument();
    expect(screen.getByTestId('dotnet-framework-step')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-type-step')).not.toBeInTheDocument();
  });

  it('hides workflow type when adding rules engine to an existing logic app', () => {
    renderSetup(ProjectType.rulesEngine, 'existing-app');

    expect(screen.queryByTestId('workflow-type-step')).not.toBeInTheDocument();
  });
});
