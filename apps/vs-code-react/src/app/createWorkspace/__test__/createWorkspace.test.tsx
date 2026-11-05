import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore, type AnyAction } from '@reduxjs/toolkit';
import { createWorkspaceSlice, type CreateWorkspaceState } from '../../../state/createWorkspaceSlice';
import {
  ExtensionCommand,
  OpenBehavior,
  Platform,
  ProjectType,
  TargetFramework,
  WorkflowType,
} from '@microsoft/vscode-extension-logic-apps';

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
    workspaceExistenceResults: {
      '/home/user/projects/my-workspace': false,
      '/home/user/projects/my-workspace/my-workspace.code-workspace': false,
    },
    isValidatingWorkspace: false,
    isValidatingPackage: false,
    separator: '/',
    platform: null,
    isDevContainerProject: false,
    availableProjects: [],
    isAddCustomCodeFlow: false,
    workspaceRootFolder: '',
    currentFolderPath: '',
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

const projectLabels = ['Logic App', 'Custom Code', 'Data Map'] as const;
const selectProjects = (selectedLabels: readonly string[]) => {
  for (const label of projectLabels) {
    const checkbox = screen.getByRole('checkbox', { name: label });
    if ((checkbox as HTMLInputElement).checked !== selectedLabels.includes(label)) {
      fireEvent.click(checkbox);
    }
  }
};

const nextWizardStep = (label: string) => {
  const next = screen.getByRole('button', { name: `Next: ${label}` });
  expect(next).toBeEnabled();
  fireEvent.click(next);
};

const goToReview = (selectedLabels: readonly string[] = ['Logic App']) => {
  selectProjects(selectedLabels);
  const steps = projectLabels.filter(
    (label) => selectedLabels.includes(label) || (label === 'Logic App' && selectedLabels.includes('Custom Code'))
  );
  for (const label of [...steps, 'Review']) {
    nextWizardStep(label);
  }
  expect(screen.getByRole('heading', { name: 'Review and create' })).toBeInTheDocument();
};

const changeText = (label: RegExp, value: string) => {
  const input = screen.getByRole('textbox', { name: label });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  return input;
};

describe('CreateWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('real wizard controls', () => {
    it('shows workspace guidance without focusing the heading on initial load', () => {
      renderWithStore();

      expect(screen.getByRole('heading', { name: 'Set up your workspace' })).not.toHaveFocus();
      expect(
        screen.getByText('Choose a location and the projects to include. Configure each project in its own step.')
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveAccessibleDescription('Creates a folder with this name.');
      expect(screen.getByRole('textbox', { name: 'Workspace parent folder' })).toHaveAccessibleDescription(
        'Your workspace will be created inside this folder.'
      );
      for (const description of [
        'Select at least one. Custom Code requires a Logic App. Data Map can be included independently.',
        'Workflows and connections. Choose Codeless or Codeful in the next step.',
        'Add a Logic Apps project with custom code.',
        'Map data between source and target schemas.',
        'Your path is based on the selected projects. Logic App is configured first because Codeful can restrict optional projects.',
      ]) {
        expect(screen.getByText(description)).toBeInTheDocument();
      }

      nextWizardStep('Logic App');
      expect(screen.getByRole('heading', { name: 'Configure your Logic App' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
      expect(screen.getByRole('heading', { name: 'Set up your workspace' })).toHaveFocus();
    });

    it('auto-selects Logic App for Custom Code and preserves Logic App when Custom Code is unchecked', () => {
      renderWithStore();
      selectProjects(['Data Map']);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Custom Code' }));
      expect(screen.getByRole('checkbox', { name: 'Logic App' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Custom Code' })).toBeChecked();
      const nav = screen.getByRole('navigation', { name: 'WORKSPACE SETUP' });
      expect(within(nav).getByRole('button', { name: '2 Logic App' })).toBeInTheDocument();
      expect(within(nav).getByRole('button', { name: '3 Custom Code' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Custom Code' }));
      expect(screen.getByRole('checkbox', { name: 'Custom Code' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Logic App' })).toBeChecked();
      expect(within(nav).getByRole('button', { name: '2 Logic App' })).toBeInTheDocument();
      expect(within(nav).queryByRole('button', { name: /Custom Code/ })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Data Map' })).toBeChecked();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Custom Code' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Logic App' }));
      expect(screen.getByRole('checkbox', { name: 'Custom Code' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Data Map' })).toBeChecked();
      expect(within(nav).queryByRole('button', { name: /Logic App|Custom Code/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next: Data Map' })).toBeEnabled();
    });

    const selections = Array.from({ length: 7 }, (_, index) => {
      const mask = index + 1;
      return projectLabels.filter((_label, bit) => (mask & (1 << bit)) !== 0);
    }).filter((labels) => !labels.includes('Custom Code') || labels.includes('Logic App'));

    for (const selectedLabels of selections) {
      it.each([true, false])(`creates exactly ${selectedLabels.join(' + ')} with open-new-window=%s`, (openNewWindow) => {
        renderWithStore();
        selectProjects(selectedLabels);
        const nav = screen.getByRole('navigation', { name: 'WORKSPACE SETUP' });
        const stepLabels = ['Workspace', ...selectedLabels, 'Review'];
        const navButtons = within(nav).getAllByRole('button');
        expect(navButtons).toHaveLength(stepLabels.length);
        stepLabels.forEach((label, index) => expect(navButtons[index]).toHaveAccessibleName(`${index + 1} ${label}`));

        for (const label of [...selectedLabels, 'Review']) {
          nextWizardStep(label);
        }
        for (const label of projectLabels) {
          const region = screen.queryByRole('region', { name: label });
          const edit = screen.queryByRole('button', { name: `Edit ${label}` });
          if (selectedLabels.includes(label)) {
            expect(region).toBeInTheDocument();
            expect(edit).toBeEnabled();
          } else {
            expect(region).not.toBeInTheDocument();
            expect(edit).not.toBeInTheDocument();
          }
        }
        const openCheckbox = screen.getByRole('checkbox', { name: 'Open workspace in a new window after creation' });
        expect(openCheckbox).toBeChecked();
        if (!openNewWindow) {
          fireEvent.click(openCheckbox);
          expect(openCheckbox).not.toBeChecked();
        }

        mockPostMessage.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
        expect(mockPostMessage).toHaveBeenCalledExactlyOnceWith({
          command: ExtensionCommand.createWorkspace,
          data: {
            workspaceProjectPath: { fsPath: '/home/user/projects', path: '/home/user/projects' },
            workspaceName: 'my-workspace',
            selectedProjects: {
              logicApp: selectedLabels.includes('Logic App'),
              customCode: selectedLabels.includes('Custom Code'),
              dataMap: selectedLabels.includes('Data Map'),
            },
            openBehavior: openNewWindow ? OpenBehavior.openInNewWindow : OpenBehavior.openInCurrentWindow,
            isDevContainerProject: false,
            ...(selectedLabels.includes('Logic App')
              ? {
                  logicAppType: ProjectType.logicApp,
                  logicAppName: 'my-logic-app',
                  logicAppFolderName: 'my-logic-app',
                  workflowName: 'my-workflow',
                  workflowType: WorkflowType.stateful,
                }
              : {}),
            ...(selectedLabels.includes('Custom Code')
              ? {
                  customCodeType: ProjectType.customCode,
                  targetFramework: TargetFramework.Net8,
                  functionFolderName: 'functions',
                  functionNamespace: 'MyApp',
                  functionName: 'MyFunction',
                }
              : {}),
            ...(selectedLabels.includes('Data Map') ? { dataMapName: 'DataMap', dataMapFolderName: 'data-map' } : {}),
          },
        });
      });
    }

    it('blocks Next and review navigation with no selected projects', () => {
      renderWithStore();
      selectProjects([]);
      expect(screen.getByRole('alert')).toHaveTextContent('Select at least one project.');
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '2 Review' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /\d Logic App/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create workspace' })).not.toBeInTheDocument();
    });

    it('associates the parent-folder label with its editable input and supports Browse', () => {
      const { store } = renderWithStore();
      const input = screen.getByRole('textbox', { name: 'Workspace parent folder' });
      expect(input).toHaveValue('/home/user/projects');
      fireEvent.change(input, { target: { value: '/another/parent' } });
      expect(store.getState().createWorkspace.workspaceProjectPath.fsPath).toBe('/another/parent');
      expect(screen.getByRole('button', { name: 'Next: Logic App' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Browse...' }));
      expect(mockPostMessage).toHaveBeenCalledWith({ command: ExtensionCommand.select_folder });
    });

    it.each([{}, { '/home/user/projects': false }])('requires confirmed valid parent path: %j', (pathValidationResults) => {
      renderWithStore({ pathValidationResults });
      expect(screen.getByRole('button', { name: 'Next: Logic App' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '3 Review' })).toBeDisabled();
    });

    it.each([
      ['Logic App', /^Logic App name/i, 'CON', 'Orders'],
      ['Logic App', /^Workflow name/i, 'Artifacts', 'ReceiveOrder'],
      ['Custom Code', /^Custom code folder name/i, 'AUX', 'custom-functions'],
      ['Custom Code', /^Function namespace/i, 'My..Namespace', 'Contoso.Functions'],
      ['Custom Code', /^Function name$/i, 'Bad-Function', 'RunOrder'],
      ['Data Map', /^Map name/i, '', 'OrderMap'],
      ['Data Map', /^Project name/i, '../outside', 'maps'],
    ] as const)('validates %s field %s before allowing review', (project, label, invalid, valid) => {
      renderWithStore();
      selectProjects([project]);
      if (project === 'Custom Code') {
        nextWizardStep('Logic App');
      }
      nextWizardStep(project);
      const input = changeText(label, invalid);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
      const reviewLabel = project === 'Custom Code' ? '4 Review' : '3 Review';
      expect(screen.getByRole('button', { name: reviewLabel })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: reviewLabel }));
      expect(screen.queryByRole('button', { name: 'Create workspace' })).not.toBeInTheDocument();
      changeText(label, valid);
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
      nextWizardStep('Review');
      expect(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled();
    });

    it.each([ProjectType.logicApp, ProjectType.codeful])(
      'uses the renamed %s project as the workflow parent folder in preview and creation',
      (logicAppType) => {
        renderWithStore({ logicAppType });
        nextWizardStep('Logic App');
        changeText(/^Logic App name/i, 'PritiLogicApp');
        changeText(/^Workflow name/i, 'SimpleWorkflow');
        const preview = within(screen.getByRole('complementary', { name: 'Workspace preview' }));
        const projectFolder = preview.getByText('PritiLogicApp/').closest('li') as HTMLElement;
        expect(
          within(projectFolder).getByText(logicAppType === ProjectType.codeful ? 'SimpleWorkflow.cs' : 'SimpleWorkflow/')
        ).toBeInTheDocument();
        expect(preview.queryByText('logic-app/')).not.toBeInTheDocument();
        expect(preview.queryByText('PritiLogicApp')).not.toBeInTheDocument();
        nextWizardStep('Review');
        expect(screen.getByRole('region', { name: 'Logic App' })).toHaveTextContent('PritiLogicApp/');
        fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
        expect(mockPostMessage).toHaveBeenCalledWith({
          command: ExtensionCommand.createWorkspace,
          data: expect.objectContaining({
            logicAppName: 'PritiLogicApp',
            logicAppFolderName: 'PritiLogicApp',
            workflowName: 'SimpleWorkflow',
          }),
        });
      }
    );

    it('rejects renaming a Logic App to an included mapper project folder', () => {
      renderWithStore();
      selectProjects(['Logic App', 'Data Map']);
      nextWizardStep('Logic App');
      changeText(/^Logic App name/i, 'data-map');
      expect(screen.getByText('Each selected project must have a different folder name.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next: Data Map' })).toBeDisabled();
      changeText(/^Logic App name/i, 'Orders');
      expect(screen.getByRole('button', { name: 'Next: Data Map' })).toBeEnabled();
    });

    it('blocks case-insensitive collisions between selected project folders and clears them when deselected', () => {
      renderWithStore();
      selectProjects(projectLabels);
      nextWizardStep('Logic App');
      nextWizardStep('Custom Code');
      changeText(/^Custom code folder name/i, 'MY-LOGIC-APP');
      expect(screen.getByText('Each selected project must have a different folder name.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next: Data Map' })).toBeDisabled();
      changeText(/^Custom code folder name/i, 'functions');
      nextWizardStep('Data Map');
      changeText(/^Project name/i, 'FUNCTIONS');
      expect(screen.getByText('Each selected project must have a different folder name.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      selectProjects(['Logic App', 'Data Map']);
      nextWizardStep('Logic App');
      nextWizardStep('Data Map');
      expect(screen.getByRole('textbox', { name: /^Project name/i })).toHaveValue('FUNCTIONS');
      expect(screen.queryByText('Each selected project must have a different folder name.')).not.toBeInTheDocument();
      nextWizardStep('Review');
      expect(screen.queryByRole('region', { name: 'Custom Code' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled();
    });

    it.each([
      ['Custom Code', 'Custom Code', /^Function name$/i, 'class', 'Enter a valid C# identifier.'],
      ['Custom Code', 'Custom Code', /^Function name$/i, 'Program', 'Enter a valid C# identifier.'],
      ['Custom Code', 'Custom Code', /^Function namespace/i, 'Contoso.class', 'Enter a valid C# namespace, such as Contoso.Orders.'],
      ['Logic App', 'Codeful', /^Logic App name/i, 'Contoso.class', 'Enter a valid C# namespace, such as Contoso.Orders.'],
      ['Logic App', 'Codeful', /^Workflow name/i, 'Program', 'Enter a valid C# identifier.'],
      ['Custom Code', 'Rules Engine', /^Function name$/i, 'ContosoPurchase', 'Enter a valid C# identifier.'],
      ['Logic App', 'Standard', /^Workflow name/i, 'bin', 'This name is reserved and cannot be used as a workflow name.'],
      ['Logic App', 'Standard', /^Workflow name/i, 'obj', 'This name is reserved and cannot be used as a workflow name.'],
    ] as const)('blocks %s %s field %s with reserved name %s', (project, subtype, label, invalid, errorMessage) => {
      renderWithStore({ platform: Platform.windows });
      selectProjects([project]);
      if (project === 'Custom Code') {
        nextWizardStep('Logic App');
      }
      nextWizardStep(project);
      fireEvent.click(screen.getByRole('radio', { name: subtype }));
      if (subtype === 'Codeful') {
        fireEvent.change(screen.getByRole('textbox', { name: /^Logic App name/i }), { target: { value: 'Contoso.Orders' } });
        fireEvent.change(screen.getByRole('textbox', { name: /^Workflow name/i }), { target: { value: 'RunOrder' } });
      }
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeEnabled();
      const input = screen.getByRole('textbox', { name: label });
      fireEvent.change(input, { target: { value: invalid } });
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
      fireEvent.blur(input);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(errorMessage);
      expect(screen.getByText(errorMessage)).toBeVisible();
      expect(screen.getByRole('button', { name: project === 'Custom Code' ? '4 Review' : '3 Review' })).toBeDisabled();
    });

    it('preserves all selected project values through Back and review edits', () => {
      renderWithStore();
      selectProjects(projectLabels);
      nextWizardStep('Logic App');
      changeText(/^Logic App name/i, 'Orders');
      changeText(/^Workflow name/i, 'ReceiveOrder');
      nextWizardStep('Custom Code');
      changeText(/^Custom code folder name/i, 'order-functions');
      changeText(/^Function namespace/i, 'Contoso.Orders');
      changeText(/^Function name$/i, 'ProcessOrder');
      nextWizardStep('Data Map');
      changeText(/^Map name/i, 'OrderMap');
      changeText(/^Project name/i, 'order-maps');
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByRole('textbox', { name: /^Function namespace/i })).toHaveValue('Contoso.Orders');
      expect(screen.getByRole('textbox', { name: /^Function name$/i })).toHaveValue('ProcessOrder');
      expect(screen.getByRole('textbox', { name: /^Custom code folder name/i })).toHaveValue('order-functions');
      nextWizardStep('Data Map');
      expect(screen.getByRole('textbox', { name: /^Map name/i })).toHaveValue('OrderMap');
      expect(screen.getByRole('textbox', { name: /^Project name/i })).toHaveValue('order-maps');
      nextWizardStep('Review');
      fireEvent.click(screen.getByRole('button', { name: 'Edit Logic App' }));
      expect(screen.getByRole('textbox', { name: /^Logic App name/i })).toHaveValue('Orders');
      expect(screen.getByRole('textbox', { name: /^Workflow name/i })).toHaveValue('ReceiveOrder');
      changeText(/^Workflow name/i, 'ReceiveUpdatedOrder');
      fireEvent.click(screen.getByRole('button', { name: '5 Review' }));
      expect(screen.getByRole('region', { name: 'Logic App' })).toHaveTextContent('ReceiveUpdatedOrder');
      expect(screen.getByRole('region', { name: 'Custom Code' })).toHaveTextContent('Contoso.Orders.ProcessOrder');
      expect(screen.getByRole('region', { name: 'Data Map' })).toHaveTextContent('OrderMap');
      fireEvent.click(screen.getByRole('button', { name: 'Edit workspace' }));
      expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveValue('my-workspace');
      for (const label of projectLabels) {
        expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
      }
      fireEvent.click(screen.getByRole('button', { name: '5 Review' }));
      expect(screen.getByRole('region', { name: 'Logic App' })).toHaveTextContent('ReceiveUpdatedOrder');
    });

    it('shows Data Map guidance and previews and submits a nested project with a named map', () => {
      renderWithStore();
      selectProjects(['Data Map']);
      nextWizardStep('Data Map');
      expect(screen.getByText('Create one Data Map project alongside your selected projects.')).toBeInTheDocument();
      expect(
        screen.getByText('Use a slash-separated project path to create nested folders, then name the map file created inside it.')
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveAccessibleDescription(
        'Use slashes to create nested folders, for example DataMaps/Orders.'
      );
      changeText(/^Project name$/, 'DataMaps/Orders');
      changeText(/^Map name$/, 'OrderMapping');
      expect(screen.getByRole('textbox', { name: 'Map name' })).toHaveAccessibleDescription(
        'OrderMapping.btm will be created inside the project folder.'
      );
      expect(within(screen.getByRole('complementary', { name: 'Workspace preview' })).getByText('OrderMapping.btm')).toBeInTheDocument();
      expect(
        screen.getByText('This creates the Data Map project structure. Add source and target schemas after the workspace opens.')
      ).toBeInTheDocument();
      nextWizardStep('Review');
      expect(screen.getByRole('region', { name: 'Data Map' })).toHaveTextContent('DataMaps/Orders/');
      expect(screen.getByRole('region', { name: 'Data Map' })).toHaveTextContent('OrderMapping.btm');
      fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.createWorkspace,
          data: expect.objectContaining({ dataMapFolderName: 'DataMaps/Orders', dataMapName: 'OrderMapping' }),
        })
      );
    });

    it.each(['../outside', '/outside', 'DataMaps/../Orders', 'DataMaps//Orders', 'DataMaps\\Orders', 'DataMaps/CON', 'my-logic-app/Maps'])(
      'rejects invalid or overlapping Data Map project path %s',
      (projectPath) => {
        renderWithStore();
        selectProjects(['Logic App', 'Data Map']);
        nextWizardStep('Logic App');
        nextWizardStep('Data Map');
        expect(changeText(/^Project name$/, projectPath)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
        changeText(/^Project name$/, 'DataMaps/Orders');
        expect(screen.getByRole('button', { name: 'Next: Review' })).toBeEnabled();
      }
    );

    it.each([
      [WorkflowType.stateful, 'Stateful'],
      [WorkflowType.stateless, 'Stateless'],
      [WorkflowType.agentic, 'Autonomous agents (Preview)'],
      [WorkflowType.agent, 'Conversational agents (Preview)'],
    ])('preserves and submits Standard workflow type %s', (type, label) => {
      renderWithStore({ workflowType: type });
      nextWizardStep('Logic App');
      const workflowType = screen.getByRole('combobox', { name: 'Workflow type' });
      expect(workflowType).toHaveValue(type);
      expect(
        within(workflowType)
          .getAllByRole('option')
          .map((option) => option.textContent)
      ).toEqual(['Stateful', 'Stateless', 'Autonomous agents (Preview)', 'Conversational agents (Preview)']);
      fireEvent.change(workflowType, { target: { value: WorkflowType.stateful } });
      fireEvent.change(workflowType, { target: { value: type } });
      nextWizardStep('Review');
      expect(screen.getByRole('region', { name: 'Logic App' })).toHaveTextContent(label);
      expect(screen.queryByText('HTTP request')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.createWorkspace,
          data: expect.objectContaining({ workflowType: type, logicAppFolderName: 'my-logic-app' }),
        })
      );
    });

    it.each([false, true])('supports Standard stateless and forces stateful when codeful=%s', (codeful) => {
      renderWithStore();
      nextWizardStep('Logic App');
      const workflowType = screen.getByRole('combobox', { name: 'Workflow type' });
      expect(workflowType).toHaveAccessibleName('Workflow type');
      expect(screen.getByRole('heading', { name: 'Workflow details' })).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Initial trigger' })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /^Logic App folder name/i })).not.toBeInTheDocument();
      expect(workflowType).toBeEnabled();
      fireEvent.change(workflowType, { target: { value: WorkflowType.stateless } });
      expect(workflowType).toHaveValue(WorkflowType.stateless);
      if (codeful) {
        fireEvent.click(screen.getByRole('radio', { name: 'Codeful' }));
        changeText(/^Logic App name/i, 'Contoso.Orders');
        changeText(/^Workflow name/i, 'RunOrder');
        expect(workflowType).toBeDisabled();
        expect(workflowType).toHaveValue(WorkflowType.stateful);
        expect(screen.queryByRole('option', { name: 'Stateless' })).not.toBeInTheDocument();
        changeText(/^Workflow name/i, 'Bad-Method');
        expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
        changeText(/^Workflow name/i, 'RunOrder');
      }
      nextWizardStep('Review');
      const summary = screen.getByRole('region', { name: 'Logic App' });
      expect(summary).toHaveTextContent(codeful ? 'Codeful' : 'Standard');
      expect(summary).toHaveTextContent(codeful ? 'Stateful' : 'Stateless');
      fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.createWorkspace,
          data: expect.objectContaining({
            logicAppType: codeful ? ProjectType.codeful : ProjectType.logicApp,
            workflowType: codeful ? WorkflowType.stateful : WorkflowType.stateless,
          }),
        })
      );
    });

    it.each([Platform.windows, 'linux', 'darwin'])('limits Rules Engine and net472 to Windows on %s', async (platform) => {
      const user = userEvent.setup();
      renderWithStore({ platform });
      selectProjects(['Custom Code']);
      nextWizardStep('Logic App');
      nextWizardStep('Custom Code');
      const rules = screen.getByRole('radio', { name: 'Rules Engine' });
      const framework = screen.getByRole('combobox', { name: '.NET version' });
      expect(framework).toHaveAccessibleName('.NET version');
      expect(screen.getByRole('radio', { name: 'Custom Code' })).toBeChecked();
      expect(framework).toHaveValue(TargetFramework.Net8);
      expect(framework).toBeEnabled();
      expect(
        within(framework)
          .getAllByRole('option')
          .map((option) => option.textContent)
      ).toEqual(platform === Platform.windows ? ['.NET Framework', '.NET 8'] : ['.NET 8']);
      expect(framework).toHaveAccessibleDescription('Use the latest .NET 8 for modern development and performance');
      if (platform === Platform.windows) {
        expect(rules).toBeEnabled();
        expect(screen.getByRole('option', { name: '.NET Framework' })).toBeInTheDocument();
        fireEvent.change(framework, { target: { value: TargetFramework.NetFx } });
        expect(framework).toHaveValue(TargetFramework.NetFx);
        expect(framework).toHaveAccessibleDescription('Use the traditional .NET Framework for legacy compatibility');
        fireEvent.click(rules);
        expect(rules).toBeChecked();
        expect(screen.queryByRole('combobox', { name: '.NET version' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Configure Rules Engine' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Rules engine configuration' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Rules engine folder name' })).toHaveValue('functions');
        expect(screen.queryByRole('textbox', { name: 'Custom code folder name' })).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Function namespace' })).toHaveAccessibleDescription(
          'The namespace used by the generated function class.'
        );
        expect(screen.getByRole('textbox', { name: 'Function name' })).toHaveValue('MyFunction');
        for (const description of [
          'The Rules Engine subtype replaces Custom Code. Your Logic App and Data Map selections are unchanged.',
          'Choose one. Custom Code and Rules Engine cannot both be included.',
          'Write your own functions',
          'Evaluate business rules',
        ]) {
          expect(screen.getByText(description)).toBeInTheDocument();
        }
        fireEvent.click(screen.getByRole('radio', { name: 'Custom Code' }));
        expect(screen.getByRole('combobox', { name: '.NET version' })).toHaveValue(TargetFramework.Net8);
        expect(screen.getByRole('combobox', { name: '.NET version' })).toBeEnabled();
        expect(screen.getByRole('heading', { name: 'Configure Custom Code' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Custom code folder name' })).toHaveValue('functions');
        fireEvent.click(rules);
      } else {
        expect(rules).toBeDisabled();
        expect(screen.queryByRole('option', { name: '.NET Framework' })).not.toBeInTheDocument();
        await user.click(rules);
        expect(screen.getByRole('radio', { name: 'Custom Code' })).toBeChecked();
      }
      nextWizardStep('Review');
      fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ExtensionCommand.createWorkspace,
          data: expect.objectContaining({
            customCodeType: platform === Platform.windows ? ProjectType.rulesEngine : ProjectType.customCode,
            targetFramework: platform === Platform.windows ? TargetFramework.NetFx : TargetFramework.Net8,
          }),
        })
      );
    });

    it('suppresses duplicate submissions while loading and permits retry after a host error', () => {
      const { store } = renderWithStore();
      goToReview();
      const create = screen.getByRole('button', { name: 'Create workspace' });
      mockPostMessage.mockClear();
      fireEvent.click(create);
      fireEvent.click(create);
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const firstMessage = mockPostMessage.mock.calls[0][0];
      expect(store.getState().createWorkspace.isLoading).toBe(true);
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
      expect(screen.getByRole('checkbox', { name: 'Open workspace in a new window after creation' })).toBeDisabled();
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { command: ExtensionCommand.createWorkspace, error: 'Unable to create local files' },
          })
        );
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to create local files');
      expect(store.getState().createWorkspace.isLoading).toBe(false);
      const retry = screen.getByRole('button', { name: 'Create workspace' });
      expect(retry).toBeEnabled();
      fireEvent.click(retry);
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
      expect(mockPostMessage.mock.calls[1][0]).toEqual(firstMessage);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(store.getState().createWorkspace.isLoading).toBe(true);
    });
  });

  describe('step rendering', () => {
    it('should render the real wizard with Logic App selected by default', () => {
      renderWithStore({ currentStep: 0 });
      expect(screen.getByRole('checkbox', { name: 'Logic App' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Custom Code' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Data Map' })).not.toBeChecked();
      expect(screen.queryByTestId('project-setup-step')).not.toBeInTheDocument();
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

    it('should render WorkspaceNameStep for ensureWorkspace flow at step 0', () => {
      const store = createTestStore({ flowType: 'ensureWorkspace', currentStep: 0 });
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

    it('should render legacy ReviewCreateStep for add-project at step 1', () => {
      renderWithStore({ currentStep: 1 }, <CreateLogicApp />);
      expect(screen.getByTestId('review-create-step')).toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('should render success message when isComplete is true', () => {
      renderWithStore({ isComplete: true });
      expect(screen.getByRole('heading', { level: 1, name: /created/i })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('should omit Back button on the workspace step', () => {
      renderWithStore({ currentStep: 0 });
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });

    it('should show Next button on first step', () => {
      renderWithStore({ currentStep: 0 });
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));
      expect(nextButton).toBeTruthy();
    });

    it('should show Create button after reaching review through the wizard', () => {
      renderWithStore();
      goToReview();
      expect(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled();
    });

    it('should disable all buttons when isLoading', () => {
      renderWithStore({ currentStep: 0, isLoading: true });
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
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

    it('should validate the logic app name on its selected project step', () => {
      renderWithStore();
      nextWizardStep('Logic App');
      changeText(/^Logic App name/i, '');
      expect(screen.getByRole('button', { name: 'Next: Review' })).toBeDisabled();
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

    it('should enable Next for ensureWorkspace with just workspace path and name', () => {
      renderWithStore(
        {
          flowType: 'ensureWorkspace',
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
        workspaceExistenceResults: {
          '/valid/path/my-ws': false,
          '/valid/path/my-ws/my-ws.code-workspace': false,
        },
      });

      goToReview();
      const createButton = screen.getByRole('button', { name: 'Create workspace' });
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

    it('should send createWorkspaceStructure command and enter loading state for ensureWorkspace flow', async () => {
      const { store } = renderWithStore(
        {
          flowType: 'ensureWorkspace',
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
          flowType: 'ensureWorkspace',
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
        workspaceExistenceResults: {
          '/valid/path/my-ws': false,
          '/valid/path/my-ws/my-ws.code-workspace': false,
        },
      });

      goToReview(['Custom Code']);
      const createButton = screen.getByRole('button', { name: 'Create workspace' });
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
        workspaceExistenceResults: {
          '/valid/path/my-ws': false,
          '/valid/path/my-ws/my-ws.code-workspace': false,
        },
      });

      goToReview(['Custom Code']);
      const createButton = screen.getByRole('button', { name: 'Create workspace' });
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

      expect(nextButton).toBeDefined();
      expect(nextButton?.hasAttribute('disabled')).toBe(false);

      fireEvent.click(nextButton as HTMLElement);
      expect(screen.getByRole('textbox', { name: /^Logic App name/i })).toBeInTheDocument();
    });

    it('should enable Next button for custom code with dotted namespace', () => {
      renderWithStore({
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

      selectProjects(['Custom Code']);
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find((b) => b.textContent?.includes('Next'));

      expect(nextButton).toBeDefined();
      expect(nextButton?.hasAttribute('disabled')).toBe(false);

      if (nextButton) {
        fireEvent.click(nextButton);
        nextWizardStep('Custom Code');
        expect(screen.getByRole('textbox', { name: /namespace/i })).toHaveValue('My.Namespace');
        expect(screen.getByRole('button', { name: 'Next: Review' })).toBeEnabled();
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

  it('CreateWorkspaceStructure sets flowType to ensureWorkspace', () => {
    const store = configureStore({
      reducer: { createWorkspace: createWorkspaceSlice.reducer },
    });

    render(
      <Provider store={store}>
        <CreateWorkspaceStructure />
      </Provider>
    );

    const state = store.getState().createWorkspace;
    expect(state.flowType).toBe('ensureWorkspace');
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
