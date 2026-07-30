import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../../state/createWorkspaceSlice';
import { LogicAppTypeStep } from '../logicAppTypeStep';

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
    CODEFUL_DESCRIPTION: 'Create workflows with C#',
    CODEFUL_LABEL: 'Codeful',
    ENTER_LOGIC_APP_NAME: 'Enter logic app name',
    LOGIC_APP_CUSTOM_CODE: 'Custom code',
    LOGIC_APP_CUSTOM_CODE_DESCRIPTION: 'Add custom code',
    LOGIC_APP_DETAILS: 'Logic app details',
    LOGIC_APP_DETAILS_DESCRIPTION: 'Configure the logic app',
    LOGIC_APP_NAME: 'Logic app name',
    LOGIC_APP_NAME_EMPTY: 'Logic app name is required',
    LOGIC_APP_NAME_SAME_AS_FUNCTION: 'Logic app name must differ from the function name',
    LOGIC_APP_NAME_VALIDATION: 'Logic app name is invalid',
    LOGIC_APP_RULES_ENGINE: 'Rules engine',
    LOGIC_APP_RULES_ENGINE_DESCRIPTION: 'Add rules engine',
    LOGIC_APP_STANDARD: 'Standard',
    LOGIC_APP_STANDARD_DESCRIPTION: 'Create a standard project',
    PROJECT_NAME_EXISTS: 'Project already exists',
  }),
  workspaceMessages: {},
}));

vi.mock('@fluentui/react-components', async () => {
  const React = await import('react');
  const RadioGroupContext = React.createContext<((value: string) => void) | undefined>(undefined);

  return {
    Combobox: ({ children, onChange, onOptionSelect, placeholder, value }: any) => (
      <div>
        <input aria-label={placeholder} onChange={onChange} placeholder={placeholder} value={value} />
        <div>{children}</div>
        <button onClick={() => onOptionSelect?.(undefined, { optionValue: 'ExistingApp' })} type="button">
          Choose ExistingApp
        </button>
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
    Option: ({ children, value }: any) => <div data-value={value}>{children}</div>,
    Radio: ({ label, value }: any) => {
      const onChange = React.useContext(RadioGroupContext);
      return (
        <button onClick={() => onChange?.(value)} type="button">
          {label}
        </button>
      );
    },
    RadioGroup: ({ children, onChange }: any) => (
      <RadioGroupContext.Provider value={(value) => onChange?.(undefined, { value })}>
        <div>{children}</div>
      </RadioGroupContext.Provider>
    ),
    Text: ({ children }: any) => <span>{children}</span>,
  };
});

function createState(overrides: Partial<CreateWorkspaceState> = {}): CreateWorkspaceState {
  return {
    currentStep: 0,
    flowType: 'createWorkspace',
    functionFolderName: 'FunctionsApp',
    functionName: '',
    functionNamespace: '',
    isComplete: false,
    isDevContainerProject: false,
    isLoading: false,
    isValidatingPackage: false,
    isValidatingWorkspace: false,
    logicAppName: 'LogicApp',
    logicAppType: ProjectType.logicApp,
    logicAppsWithoutCustomCode: undefined,
    openBehavior: '',
    packagePath: { fsPath: '', path: '' },
    packageValidationResults: {},
    pathValidationResults: {},
    platform: null,
    projectType: '',
    separator: '/',
    targetFramework: '',
    workflowName: '',
    workflowType: 'Stateful-Codeless',
    workspaceExistenceResults: {},
    workspaceFileJson: { folders: [{ name: 'DuplicateApp' }] },
    existingFolders: ['DuplicateApp', 'CSharpProject'],
    workspaceName: 'Workspace',
    workspaceProjectPath: { fsPath: '/tmp/projects', path: '/tmp/projects' },
    availableProjects: [],
    ...overrides,
  };
}

function renderLogicAppType(overrides: Partial<CreateWorkspaceState> = {}) {
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
      <LogicAppTypeStep />
    </Provider>
  );

  return store;
}

describe('LogicAppTypeStep', () => {
  it('updates the logic app name and shows the path preview', () => {
    const store = renderLogicAppType();

    fireEvent.change(screen.getByPlaceholderText('Enter logic app name'), { target: { value: 'Orders' } });

    expect(store.getState().createWorkspace.logicAppName).toBe('Orders');
    expect(screen.getByText('/tmp/projects/Workspace/Orders')).toBeInTheDocument();
  });

  it('selects rules engine and defaults the target framework', () => {
    const store = renderLogicAppType();

    fireEvent.click(screen.getByRole('button', { name: 'Rules engine' }));

    expect(store.getState().createWorkspace.logicAppType).toBe(ProjectType.rulesEngine);
    expect(store.getState().createWorkspace.targetFramework).toBe('net472');
  });

  it('uses the existing logic app combobox for custom code projects', () => {
    const store = renderLogicAppType({
      logicAppName: '',
      logicAppType: ProjectType.customCode,
      logicAppsWithoutCustomCode: [{ label: 'ExistingApp' }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Choose ExistingApp' }));

    expect(store.getState().createWorkspace.logicAppName).toBe('ExistingApp');
  });

  it('shows validation when the logic app name matches the function folder', () => {
    renderLogicAppType({ logicAppName: '', functionFolderName: 'FunctionsApp' });

    fireEvent.change(screen.getByPlaceholderText('Enter logic app name'), { target: { value: 'FunctionsApp' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Logic app name must differ from the function name');
  });

  it('shows validation for invalid logic app names', () => {
    renderLogicAppType({ logicAppName: '' });

    fireEvent.change(screen.getByPlaceholderText('Enter logic app name'), { target: { value: '1logicapp' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Logic app name is invalid');
  });

  it('shows validation when the logic app project already exists', () => {
    renderLogicAppType({ logicAppName: '' });

    fireEvent.change(screen.getByPlaceholderText('Enter logic app name'), { target: { value: 'DuplicateApp' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Project already exists');
  });

  it('shows validation when the name collides with an existing folder on disk (case-insensitive)', () => {
    renderLogicAppType({ logicAppName: '', existingFolders: ['CSharpProject', 'MyFunctions'] });

    fireEvent.change(screen.getByPlaceholderText('Enter logic app name'), { target: { value: 'csharpproject' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Project already exists');
  });
});
