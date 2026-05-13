import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { ExtensionCommand, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { ValidationStatus } from '../../../../run-service';
import { Status } from '../../../../state/WorkflowSlice';
import { VSCodeContext } from '../../../../webviewCommunication';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigation } from '../navigation';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: '/instance-selection',
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../../../run-service', () => ({
  ValidationStatus: {
    failed: 'Failed',
    succeeded: 'Succeeded',
    succeeded_with_warnings: 'SucceededWithWarning',
  },
}));

vi.mock('../../../../state/WorkflowSlice', () => ({
  Status: {
    Failed: 'Failed',
    InProgress: 'InProgress',
    Succeeded: 'Succeeded',
  },
}));

vi.mock('../../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: vi.fn() }),
  };
});

vi.mock('../../exportStyles', () => ({
  useExportStyles: () => ({
    navigationPanel: 'navigation-panel',
    navigationPanelButton: 'navigation-panel-button',
  }),
}));

vi.mock('../../../../intl', () => ({
  exportMessages: {},
  useIntlMessages: () => ({
    BACK: 'Back',
    EXPORT: 'Export',
    EXPORT_WITH_WARNINGS: 'Export with warnings',
    FINISH: 'Finish',
    NEXT: 'Next',
  }),
}));

vi.mock('@fluentui/react-components', () => ({
  Button: ({ children, disabled, onClick, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

function createWorkflowState(overrides: Record<string, any> = {}) {
  return {
    finalStatus: Status.InProgress,
    exportData: {
      location: 'westus',
      managedConnections: {
        isManaged: false,
        resourceGroup: undefined,
        resourceGroupLocation: undefined,
      },
      packageUrl: 'https://package',
      selectedIse: '',
      selectedSubscription: 'subscription-id',
      selectedWorkflows: ['workflow-a'],
      targetDirectory: { path: '/tmp/export' },
      validationState: ValidationStatus.succeeded,
    },
    ...overrides,
  };
}

function renderNavigation(workflowOverrides: Record<string, any> = {}) {
  const postMessage = vi.fn();
  const store = configureStore({
    reducer: {
      workflow: () => createWorkflowState(workflowOverrides),
    },
  });

  render(
    <VSCodeContext.Provider value={{ postMessage }}>
      <Provider store={store}>
        <Navigation />
      </Provider>
    </VSCodeContext.Provider>
  );

  return { postMessage };
}

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = `/${RouteName.instance_selection}`;
  });

  it('disables navigation when the instance selection step is incomplete', () => {
    renderNavigation({
      exportData: {
        ...createWorkflowState().exportData,
        location: '',
        selectedIse: '',
        selectedSubscription: '',
      },
    });

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('moves from workflow selection to validation and logs telemetry', () => {
    mocks.pathname = `/${RouteName.workflows_selection}`;
    const { postMessage } = renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mocks.navigate).toHaveBeenCalledWith(RouteName.validation);
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.logTelemetry,
      key: 'lastStep',
      value: RouteName.validation,
    });
  });

  it('starts export from the summary page with managed connection metadata', () => {
    mocks.pathname = `/${RouteName.summary}`;
    const { postMessage } = renderNavigation({
      exportData: {
        ...createWorkflowState().exportData,
        managedConnections: {
          isManaged: true,
          resourceGroup: 'rg',
          resourceGroupLocation: 'eastus',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export and Finish' }));

    expect(mocks.navigate).toHaveBeenCalledWith(RouteName.status);
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.export_package,
      location: 'eastus',
      packageUrl: 'https://package',
      resourceGroupName: 'rg',
      selectedSubscription: 'subscription-id',
      targetDirectory: { path: '/tmp/export' },
    });
  });
});
