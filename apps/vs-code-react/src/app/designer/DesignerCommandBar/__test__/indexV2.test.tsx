import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockPostMessage, mockDispatch, mockGetState } = vi.hoisted(() => {
  return {
    mockPostMessage: vi.fn(),
    mockDispatch: vi.fn(() => Promise.resolve()),
    mockGetState: vi.fn(() => ({
      operations: { inputParameters: {} },
      customCode: {},
      workflow: { operations: { inputParameters: {} } },
    })),
  };
});

// Mock webviewCommunication
vi.mock('../../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

// Track which hooks return what
let mockCanUndo = false;
let mockCanRedo = false;
let mockDesignerIsDirty = false;

// Mock the designer-v2 library
vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  serializeWorkflow: vi.fn(),
  store: { dispatch: mockDispatch, getState: mockGetState },
  serializeUnitTestDefinition: vi.fn(),
  getNodeOutputOperations: vi.fn(),
  useIsDesignerDirty: () => mockDesignerIsDirty,
  validateParameter: vi.fn(() => []),
  updateParameterValidation: vi.fn(),
  openPanel: vi.fn((arg: unknown) => ({ type: 'openPanel', payload: arg })),
  useAssertionsValidationErrors: () => ({}),
  useWorkflowParameterValidationErrors: () => ({}),
  useAllSettingsValidationErrors: () => ({}),
  useAllConnectionErrors: () => ({}),
  getCustomCodeFilesWithData: vi.fn(() => ({})),
  resetDesignerDirtyState: vi.fn(),
  onUndoClick: vi.fn(() => ({ type: 'onUndoClick' })),
  onRedoClick: vi.fn(() => ({ type: 'onRedoClick' })),
  useCanUndo: () => mockCanUndo,
  useCanRedo: () => mockCanRedo,
  resetDesignerView: vi.fn(() => ({ type: 'resetDesignerView' })),
  collapsePanel: vi.fn(() => ({ type: 'collapsePanel' })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isNullOrEmpty: vi.fn(() => true),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    saveUnitTest: 'saveUnitTest',
    createUnitTest: 'createUnitTest',
    createUnitTestFromRun: 'createUnitTestFromRun',
    logTelemetry: 'logTelemetry',
    fileABug: 'fileABug',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((fn: unknown) => ({
    isLoading: false,
    mutate: fn,
  })),
}));

vi.mock('@fluentui/react-components', async () => {
  const React = await import('react');
  return {
    Button: (props: any) => <button {...props}>{props.children}</button>,
    Card: (props: any) => <div {...props}>{props.children}</div>,
    Divider: () => <hr />,
    Menu: (props: any) => <div {...props}>{props.children}</div>,
    MenuDivider: () => <hr />,
    MenuItem: ({ children, ...props }: any) => (
      <button role="menuitem" {...props}>
        {children}
      </button>
    ),
    MenuList: (props: any) => (
      <div role="menu" {...props}>
        {props.children}
      </div>
    ),
    MenuPopover: (props: any) => <div {...props}>{props.children}</div>,
    MenuTrigger: (props: any) => <>{props.children}</>,
    mergeClasses: (...args: string[]) => args.filter(Boolean).join(' '),
    Spinner: () => <span>Loading...</span>,
    Toolbar: (props: any) => (
      <div role="toolbar" {...props}>
        {props.children}
      </div>
    ),
    ToolbarButton: (props: any) => <button {...props}>{props.children}</button>,
  };
});

vi.mock('@fluentui/react-icons', () => {
  const icon = () => null;
  return {
    SaveRegular: icon,
    ErrorCircleFilled: icon,
    ErrorCircleRegular: icon,
    MoreHorizontalFilled: icon,
    MoreHorizontalRegular: icon,
    MentionBracketsRegular: icon,
    BeakerRegular: icon,
    CheckmarkRegular: icon,
    bundleIcon: () => icon,
    BugFilled: icon,
    BugRegular: icon,
    SaveFilled: icon,
    BeakerFilled: icon,
    MentionBracketsFilled: icon,
    LinkFilled: icon,
    LinkRegular: icon,
    CheckmarkFilled: icon,
    ArrowUndoFilled: icon,
    ArrowUndoRegular: icon,
    ArrowRedoFilled: icon,
    ArrowRedoRegular: icon,
  };
});

vi.mock('../styles', () => ({
  useCommandBarStyles: () => ({
    viewModeContainer: '',
    viewButton: '',
    selectedButton: '',
  }),
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({})),
}));

vi.mock('../../../../intl', () => ({
  useIntlMessages: () => ({
    SAVE: 'Save',
    DISCARD: 'Discard',
    PARAMETERS: 'Parameters',
    CONNECTIONS: 'Connections',
    ERRORS: 'Errors',
    UNDO: 'Undo',
    REDO: 'Redo',
    FILE_BUG: 'File a bug',
    SAVE_UNIT_TEST: 'Save unit test definition',
    CREATE_UNIT_TEST: 'Create unit test',
    CREATE_UNIT_TEST_FROM_RUN: 'Create unit test from run',
    UNIT_TEST_ASSERTIONS: 'Assertions',
  }),
  designerMessages: {},
}));

import { DesignerCommandBar } from '../indexV2';
import { onUndoClick, onRedoClick } from '@microsoft/logic-apps-designer-v2';

const defaultProps = {
  isDarkMode: false,
  isUnitTest: false,
  isLocal: false,
  runId: '',
  saveWorkflow: vi.fn(),
  saveWorkflowFromCode: vi.fn(),
  discard: vi.fn(),
  isDesignerView: true,
  isCodeView: false,
  isMonitoringView: false,
  switchToDesignerView: vi.fn(),
  switchToCodeView: vi.fn(),
  switchToMonitoringView: vi.fn(),
};

describe('DesignerCommandBar (V2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanUndo = false;
    mockCanRedo = false;
    mockDesignerIsDirty = false;
  });

  it('should render the toolbar', () => {
    render(<DesignerCommandBar {...defaultProps} />);
    expect(screen.getByRole('toolbar')).toBeDefined();
  });

  it('should render undo and redo menu items', () => {
    render(<DesignerCommandBar {...defaultProps} />);
    expect(screen.getByText('Undo')).toBeDefined();
    expect(screen.getByText('Redo')).toBeDefined();
  });

  it('should disable undo when canUndo is false', () => {
    mockCanUndo = false;
    render(<DesignerCommandBar {...defaultProps} />);
    const undoButton = screen.getByText('Undo').closest('button');
    expect(undoButton?.disabled).toBe(true);
  });

  it('should disable redo when canRedo is false', () => {
    mockCanRedo = false;
    render(<DesignerCommandBar {...defaultProps} />);
    const redoButton = screen.getByText('Redo').closest('button');
    expect(redoButton?.disabled).toBe(true);
  });

  it('should enable undo when canUndo is true and in designer view', () => {
    mockCanUndo = true;
    render(<DesignerCommandBar {...defaultProps} isDesignerView={true} />);
    const undoButton = screen.getByText('Undo').closest('button');
    expect(undoButton?.disabled).toBe(false);
  });

  it('should enable redo when canRedo is true and in designer view', () => {
    mockCanRedo = true;
    render(<DesignerCommandBar {...defaultProps} isDesignerView={true} />);
    const redoButton = screen.getByText('Redo').closest('button');
    expect(redoButton?.disabled).toBe(false);
  });

  it('should dispatch onUndoClick when undo is clicked', async () => {
    mockCanUndo = true;
    render(<DesignerCommandBar {...defaultProps} isDesignerView={true} />);
    const undoButton = screen.getByText('Undo').closest('button') as HTMLButtonElement;
    await userEvent.click(undoButton);
    expect(onUndoClick).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should dispatch onRedoClick when redo is clicked', async () => {
    mockCanRedo = true;
    render(<DesignerCommandBar {...defaultProps} isDesignerView={true} />);
    const redoButton = screen.getByText('Redo').closest('button') as HTMLButtonElement;
    await userEvent.click(redoButton);
    expect(onRedoClick).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should disable undo and redo when not in designer view', () => {
    mockCanUndo = true;
    mockCanRedo = true;
    render(<DesignerCommandBar {...defaultProps} isDesignerView={false} />);
    const undoButton = screen.getByText('Undo').closest('button');
    const redoButton = screen.getByText('Redo').closest('button');
    expect(undoButton?.disabled).toBe(true);
    expect(redoButton?.disabled).toBe(true);
  });

  it('should render view mode buttons', () => {
    render(<DesignerCommandBar {...defaultProps} />);
    expect(screen.getByText('Workflow')).toBeDefined();
    expect(screen.getByText('Code')).toBeDefined();
    expect(screen.getByText('Run history')).toBeDefined();
  });

  it('should render save button as disabled when not dirty', () => {
    mockDesignerIsDirty = false;
    render(<DesignerCommandBar {...defaultProps} />);
    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton?.disabled).toBe(true);
  });
});
