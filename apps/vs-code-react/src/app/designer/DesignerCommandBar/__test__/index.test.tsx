import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const baseState = {
  operations: { inputParameters: {} },
  customCode: {},
  designerOptions: { isMonitoringView: false },
  workflow: { workflowKind: 'stateful' },
};

// `currentStoreState` simulates the live Redux store. Tests mutate it to represent an edit that
// happens after the command bar last rendered (e.g. a run-after change while already dirty).
let currentStoreState: any = baseState;

const { mockPostMessage, mockDispatch, mockGetState, mockSerializeWorkflow } = vi.hoisted(() => {
  return {
    mockPostMessage: vi.fn(),
    mockDispatch: vi.fn(() => Promise.resolve()),
    mockGetState: vi.fn(),
    mockSerializeWorkflow: vi.fn(async () => ({ definition: {}, parameters: {}, connectionReferences: {} })),
  };
});

vi.mock('../../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

let mockDesignerIsDirty = true;

vi.mock('@microsoft/logic-apps-designer', () => ({
  serializeWorkflow: mockSerializeWorkflow,
  store: { dispatch: mockDispatch, getState: mockGetState },
  getNodeOutputOperations: vi.fn(),
  useIsDesignerDirty: () => mockDesignerIsDirty,
  validateParameter: vi.fn(() => []),
  updateParameterValidation: vi.fn(),
  openPanel: vi.fn((arg: unknown) => ({ type: 'openPanel', payload: arg })),
  useWorkflowParameterValidationErrors: () => ({}),
  useAllSettingsValidationErrors: () => ({}),
  useAllConnectionErrors: () => ({}),
  getCustomCodeFilesWithData: vi.fn(() => ({})),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  RUN_AFTER_COLORS: { light: { FAILED: '#f00' }, dark: { FAILED: '#f00' } },
  equals: (a: string, b: string) => a === b,
  isNullOrEmpty: () => true,
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    save: 'save',
    createUnitTest: 'createUnitTest',
    createUnitTestFromRun: 'createUnitTestFromRun',
    logTelemetry: 'logTelemetry',
    fileABug: 'fileABug',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((fn: any) => ({ isLoading: false, mutate: fn })),
}));

vi.mock('@fluentui/react-components', async () => {
  const React = await import('react');
  return {
    Spinner: () => <span>Loading...</span>,
    Toolbar: (props: any) => (
      <div role="toolbar" {...props}>
        {props.children}
      </div>
    ),
    ToolbarButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Tooltip: (props: any) => <>{props.children}</>,
  };
});

vi.mock('@fluentui/react-icons', () => {
  const icon = () => null;
  return {
    SaveRegular: icon,
    ArrowClockwiseRegular: icon,
    MentionBracketsRegular: icon,
    ReplayRegular: icon,
    DismissCircleRegular: icon,
    DismissCircleFilled: icon,
    BeakerRegular: icon,
    bundleIcon: () => icon,
    BugFilled: icon,
    BugRegular: icon,
    SaveFilled: icon,
    BeakerFilled: icon,
    MentionBracketsFilled: icon,
    LinkFilled: icon,
    LinkRegular: icon,
    ArrowClockwiseFilled: icon,
    ReplayFilled: icon,
  };
});

vi.mock('@microsoft/designer-ui', () => ({
  TrafficLightDot: () => null,
}));

vi.mock('../chat', () => ({
  ChatButton: () => null,
}));

vi.mock('../../../intl', () => ({
  useIntlMessages: () => ({
    SAVE: 'Save',
    PARAMETERS: 'Parameters',
    CONNECTIONS: 'Connections',
    ERRORS: 'Errors',
    FILE_BUG: 'File a bug',
    COMMAND_BAR_ARIA: 'Command bar',
  }),
  designerMessages: {},
}));

import { DesignerCommandBar } from '../index';

const defaultProps = {
  isRefreshing: false,
  isDisabled: false,
  isWorkflowRuntimeRunning: false,
  onRefresh: vi.fn(),
  isDarkMode: false,
  isLocal: true,
  runId: '',
};

describe('DesignerCommandBar (V1) save path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDesignerIsDirty = true;
    currentStoreState = baseState;
    mockGetState.mockImplementation(() => currentStoreState);
  });

  it('serializes the latest store state at save time, not the render-time snapshot (issue #9412)', async () => {
    render(<DesignerCommandBar {...defaultProps} />);

    // Simulate an edit (e.g. a run-after status change) made after the command bar last rendered.
    // The workflow was already dirty, so this component does not re-render.
    const freshState = {
      ...baseState,
      marker: 'fresh',
    };
    currentStoreState = freshState;

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    await waitFor(() => expect(mockSerializeWorkflow).toHaveBeenCalled());
    expect(mockSerializeWorkflow.mock.calls[0][0]).toBe(freshState);
    expect(mockSerializeWorkflow.mock.calls[0][0]).toHaveProperty('marker', 'fresh');
  });
});
