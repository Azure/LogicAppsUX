import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ProjectType, WorkflowType } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../../state/createWorkspaceSlice';
import { WorkflowTypeStep } from '../workflowTypeStep';

vi.mock('../../createWorkspaceStyles', () => ({
  useCreateWorkspaceStyles: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => `mock-${String(prop)}`,
      }
    ),
}));

vi.mock('../../../../intl', () => ({
  useIntlMessages: () => ({
    AGENT_TITLE: 'Conversational agents (Preview)',
    AUTONOMOUS_TITLE: 'Autonomous agents (Preview)',
    EMPTY_WORKFLOW_NAME: 'Workflow name cannot be empty.',
    ENTER_WORKFLOW_NAME: 'Enter workflow name',
    SELECT_WORKFLOW_TYPE: 'Select workflow type',
    STATEFUL_TITLE: 'Stateful',
    STATELESS_TITLE: 'Stateless',
    WORKFLOW_CONFIGURATION: 'Workflow configuration',
    WORKFLOW_NAME_VALIDATION_MESSAGE: 'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".',
    WORKFLOW_NAME: 'Workflow name',
    WORKFLOW_TYPE: 'Workflow type',
  }),
  workspaceMessages: {},
}));

vi.mock('@fluentui/react-components', async () => {
  const React = await import('react');

  return {
    Dropdown: ({ children, onOptionSelect, placeholder, value }: any) => (
      <div>
        <span>{value || placeholder}</span>
        <button onClick={() => onOptionSelect?.(undefined, { optionValue: 'Agentic-Codeful' })} type="button">
          Choose autonomous
        </button>
        <div>{children}</div>
      </div>
    ),
    Field: ({ children, label, validationMessage }: any) => (
      <label>
        <span>{label}</span>
        {children}
        {validationMessage ? <span role="alert">{validationMessage}</span> : null}
      </label>
    ),
    Input: ({ onChange, placeholder, value }: any) => (
      <input aria-label={placeholder} onChange={onChange} placeholder={placeholder} value={value} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Option: ({ children, value }: any) => <div data-value={value}>{children}</div>,
    Text: ({ children }: any) => <span>{children}</span>,
  };
});

function createState(overrides: Partial<CreateWorkspaceState> = {}): CreateWorkspaceState {
  return {
    currentStep: 0,
    flowType: 'createWorkspace',
    functionFolderName: '',
    functionName: '',
    functionNamespace: '',
    isComplete: false,
    isDevContainerProject: false,
    isLoading: false,
    isValidatingPackage: false,
    isValidatingWorkspace: false,
    logicAppName: 'LogicApp',
    logicAppType: ProjectType.logicApp,
    openBehavior: '',
    packagePath: { fsPath: '', path: '' },
    packageValidationResults: {},
    pathValidationResults: {},
    platform: null,
    projectType: '',
    separator: '/',
    targetFramework: '',
    workflowName: 'workflow',
    workflowType: WorkflowType.stateful,
    workspaceExistenceResults: {},
    workspaceFileJson: '',
    workspaceName: 'Workspace',
    workspaceProjectPath: { fsPath: '/tmp/projects', path: '/tmp/projects' },
    existingFolders: [],
    logicAppsWithoutCustomCode: undefined,
    availableProjects: [],
    ...overrides,
  };
}

function renderWorkflowTypeStep(overrides: Partial<CreateWorkspaceState> = {}) {
  const store = configureStore({
    reducer: {
      createWorkspace: createWorkspaceSlice.reducer,
    },
    preloadedState: {
      createWorkspace: createState(overrides),
    },
  });

  render(
    <Provider store={store}>
      <WorkflowTypeStep />
    </Provider>
  );

  return store;
}

describe('WorkflowTypeStep', () => {
  it('shows autonomous agents as a codeful workflow type and stores its value', () => {
    const store = renderWorkflowTypeStep({
      logicAppType: ProjectType.codeful,
      workflowType: WorkflowType.statefulCodeful,
    });

    expect(screen.getByText('Autonomous agents (Preview)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Choose autonomous'));

    expect(store.getState().createWorkspace.workflowType).toBe(WorkflowType.agenticCodeful);
  });

  it('clears validation for a valid workflow name', () => {
    const store = renderWorkflowTypeStep({
      workflowName: '',
    });

    fireEvent.change(screen.getByLabelText('Enter workflow name'), { target: { value: 'la-trigger-github' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(store.getState().createWorkspace.workflowName).toBe('la-trigger-github');
  });

  it('shows the empty workflow name message', () => {
    renderWorkflowTypeStep({
      workflowName: 'workflow',
    });

    fireEvent.change(screen.getByLabelText('Enter workflow name'), { target: { value: '' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Workflow name cannot be empty.');
  });

  it('shows the workflow name validation message for invalid names', () => {
    renderWorkflowTypeStep({
      workflowName: '',
    });

    fireEvent.change(screen.getByLabelText('Enter workflow name'), { target: { value: '1workflow' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Workflow name must start with a letter and can only contain letters, digits, "_" and "-".'
    );
  });
});
