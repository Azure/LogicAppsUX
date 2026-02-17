import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

// Use vi.hoisted to define mock variables that are used in vi.mock factories
const { mockPostMessage, mockDesignerIsDirty, mockChangeCount } = vi.hoisted(() => {
  return {
    mockPostMessage: vi.fn(),
    mockDesignerIsDirty: { current: false },
    mockChangeCount: { current: 0 },
  };
});

// Mock webviewCommunication to avoid acquireVsCodeApi global
vi.mock('../../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  serializeWorkflow: vi.fn(),
  store: { dispatch: vi.fn(), getState: vi.fn(() => ({ operations: { inputParameters: {} }, customCode: {} })) },
  serializeUnitTestDefinition: vi.fn(),
  getNodeOutputOperations: vi.fn(),
  useIsDesignerDirty: vi.fn(() => mockDesignerIsDirty.current),
  validateParameter: vi.fn(() => []),
  updateParameterValidation: vi.fn(),
  openPanel: vi.fn((arg: any) => arg),
  useAssertionsValidationErrors: vi.fn(() => ({})),
  useWorkflowParameterValidationErrors: vi.fn(() => ({})),
  useAllSettingsValidationErrors: vi.fn(() => ({})),
  useAllConnectionErrors: vi.fn(() => ({})),
  getCustomCodeFilesWithData: vi.fn(() => ({})),
  resetDesignerDirtyState: vi.fn(),
  resetDesignerView: vi.fn(),
  collapsePanel: vi.fn(),
  useChangeCount: vi.fn(() => mockChangeCount.current),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  isNullOrEmpty: vi.fn((val) => !val || Object.keys(val).length === 0),
  useThrottledEffect: vi.fn(),
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    save: 'save',
    saveUnitTest: 'saveUnitTest',
    createUnitTest: 'createUnitTest',
    createUnitTestFromRun: 'createUnitTestFromRun',
    logTelemetry: 'logTelemetry',
    fileABug: 'fileABug',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((fn: any) => ({
    mutate: vi.fn(() => fn?.()),
    isLoading: false,
  })),
}));

vi.mock('../styles', () => ({
  useCommandBarStyles: vi.fn(() => ({
    viewModeContainer: 'viewModeContainer',
    viewButton: 'viewButton',
    selectedButton: 'selectedButton',
  })),
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({})),
}));

vi.mock('../../../../intl', () => ({
  useIntlMessages: vi.fn(() => ({
    WORKFLOW_TAB: 'Workflow',
    CODE_TAB: 'Code',
    RUN_HISTORY_TAB: 'Run History',
    PUBLISH: 'Publish',
    PUBLISHING: 'Publishing...',
    SAVE: 'Save',
    DISCARD: 'Discard',
    DISCARD_SESSION_CHANGES: 'Discard session changes',
    DISCARD_DRAFT: 'Discard draft',
    SAVING_DRAFT: 'Saving...',
    ERROR_AUTOSAVING_DRAFT: 'Error autosaving draft',
    AUTOSAVED_SECONDS_AGO: 'Autosaved seconds ago',
    AUTOSAVED_MINUTES_AGO: 'Autosaved minutes ago',
    AUTOSAVED_ONE_HOUR_AGO: 'Autosaved 1 hour ago',
    SWITCH_TO_PUBLISHED: 'Switch to published',
    SWITCH_TO_DRAFT: 'Switch to draft',
    MORE_ACTIONS: 'More actions',
    PARAMETERS: 'Parameters',
    CONNECTIONS: 'Connections',
    ERRORS: 'Errors',
    SAVE_UNIT_TEST: 'Save unit test',
    CREATE_UNIT_TEST: 'Create unit test',
    CREATE_UNIT_TEST_FROM_RUN: 'Create unit test from run',
    UNIT_TEST_ASSERTIONS: 'Assertions',
    FILE_BUG: 'File a bug',
  })),
  useIntlFormatters: vi.fn(() => ({
    DRAFT_AUTOSAVED_AT: vi.fn(({ time }: any) => `Draft autosaved at ${time}`),
    AUTOSAVED_HOURS_AGO: vi.fn(({ count }: any) => `Autosaved ${count} hours ago`),
  })),
  designerMessages: {},
}));

// Import after mocks
import { DesignerCommandBar, type DesignerCommandBarProps } from '../indexV2';

const defaultProps: DesignerCommandBarProps = {
  isDarkMode: false,
  isUnitTest: false,
  isLocal: true,
  runId: '',
  saveWorkflow: vi.fn().mockResolvedValue({}),
  saveWorkflowFromCode: vi.fn().mockResolvedValue({}),
  discard: vi.fn(),
  isDesignerView: true,
  isCodeView: false,
  isMonitoringView: false,
  switchToDesignerView: vi.fn(),
  switchToCodeView: vi.fn(),
  switchToMonitoringView: vi.fn(),
  isDraftMode: true,
  saveDraftWorkflow: vi.fn(),
  discardDraft: vi.fn(),
  switchWorkflowMode: vi.fn(),
  lastDraftSaveTime: null,
  draftSaveError: null,
  isDraftSaving: false,
  hasDraft: false,
};

const renderCommandBar = (props: Partial<DesignerCommandBarProps> = {}) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      <DesignerCommandBar {...defaultProps} {...props} />
    </FluentProvider>
  );
};

describe('DesignerCommandBar (V2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDesignerIsDirty.current = false;
    mockChangeCount.current = 0;
  });

  describe('View mode tabs', () => {
    it('should render Workflow, Code, and Run History tabs', () => {
      renderCommandBar();
      expect(screen.getByText('Workflow')).toBeDefined();
      expect(screen.getByText('Code')).toBeDefined();
      expect(screen.getByText('Run History')).toBeDefined();
    });

    it('should call switchToCodeView when Code tab is clicked', () => {
      const switchToCodeView = vi.fn();
      renderCommandBar({ switchToCodeView });
      fireEvent.click(screen.getByText('Code'));
      expect(switchToCodeView).toHaveBeenCalled();
    });

    it('should call switchToMonitoringView when Run History tab is clicked', () => {
      const switchToMonitoringView = vi.fn();
      renderCommandBar({ switchToMonitoringView });
      fireEvent.click(screen.getByText('Run History'));
      expect(switchToMonitoringView).toHaveBeenCalled();
    });
  });

  describe('Save/Publish button', () => {
    it('should display "Publish" when in draft mode', () => {
      mockDesignerIsDirty.current = true;
      renderCommandBar({ isDraftMode: true, hasDraft: true });
      expect(screen.getByText('Publish')).toBeDefined();
    });

    it('should be disabled when in monitoring view', () => {
      renderCommandBar({ isMonitoringView: true });
      const publishBtn = screen.getByText('Publish').closest('button');
      expect(publishBtn?.disabled).toBe(true);
    });

    it('should be disabled when not dirty and no draft', () => {
      mockDesignerIsDirty.current = false;
      renderCommandBar({ isDraftMode: true, hasDraft: false });
      const publishBtn = screen.getByText('Publish').closest('button');
      expect(publishBtn?.disabled).toBe(true);
    });

    it('should be enabled when hasDraft even if not dirty', () => {
      mockDesignerIsDirty.current = false;
      renderCommandBar({ isDraftMode: true, hasDraft: true });
      const publishBtn = screen.getByText('Publish').closest('button');
      expect(publishBtn?.disabled).toBe(false);
    });

    it('should be disabled when not in draft mode', () => {
      mockDesignerIsDirty.current = true;
      renderCommandBar({ isDraftMode: false, hasDraft: true });
      const publishBtn = screen.getByText('Publish').closest('button');
      expect(publishBtn?.disabled).toBe(true);
    });
  });

  describe('Discard button', () => {
    it('should render simple discard button when no draft exists', () => {
      renderCommandBar({ hasDraft: false });
      // No dropdown menu items visible
      expect(screen.queryByText('Discard session changes')).toBeNull();
      expect(screen.queryByText('Discard draft')).toBeNull();
    });

    it('should render discard dropdown menu when draft exists', () => {
      renderCommandBar({ hasDraft: true });
      // The discard button should be a menu trigger - click it to open
      const discardBtn = screen.getByLabelText('Discard');
      fireEvent.click(discardBtn);
      expect(screen.getByText('Discard session changes')).toBeDefined();
      expect(screen.getByText('Discard draft')).toBeDefined();
    });

    it('should call discardDraft when "Discard draft" is clicked', () => {
      const discardDraft = vi.fn();
      renderCommandBar({ hasDraft: true, discardDraft });
      fireEvent.click(screen.getByLabelText('Discard'));
      fireEvent.click(screen.getByText('Discard draft'));
      expect(discardDraft).toHaveBeenCalled();
    });
  });

  describe('Draft save notification', () => {
    it('should show "Saving..." when isDraftSaving', () => {
      renderCommandBar({ isDraftMode: true, isDraftSaving: true, isDesignerView: true });
      expect(screen.getByText('Saving...')).toBeDefined();
    });

    it('should show error badge when draftSaveError exists', () => {
      renderCommandBar({ isDraftMode: true, draftSaveError: 'Network error', isDesignerView: true });
      expect(screen.getByText('Error autosaving draft')).toBeDefined();
    });

    it('should not show notification when not in draft mode', () => {
      renderCommandBar({ isDraftMode: false, lastDraftSaveTime: Date.now(), isDesignerView: true });
      expect(screen.queryByText('Saving...')).toBeNull();
    });
  });

  describe('Overflow menu', () => {
    it('should show "Switch to published" when hasDraft and isDraftMode', () => {
      renderCommandBar({ hasDraft: true, isDraftMode: true });
      fireEvent.click(screen.getByLabelText('More actions'));
      expect(screen.getByText('Switch to published')).toBeDefined();
    });

    it('should show "Switch to draft" when hasDraft and not isDraftMode', () => {
      renderCommandBar({ hasDraft: true, isDraftMode: false });
      fireEvent.click(screen.getByLabelText('More actions'));
      expect(screen.getByText('Switch to draft')).toBeDefined();
    });

    it('should not show switch options when no draft exists', () => {
      renderCommandBar({ hasDraft: false, isDraftMode: true });
      fireEvent.click(screen.getByLabelText('More actions'));
      expect(screen.queryByText('Switch to published')).toBeNull();
      expect(screen.queryByText('Switch to draft')).toBeNull();
    });

    it('should call switchWorkflowMode(false) when "Switch to published" is clicked', () => {
      const switchWorkflowMode = vi.fn();
      renderCommandBar({ hasDraft: true, isDraftMode: true, switchWorkflowMode });
      fireEvent.click(screen.getByLabelText('More actions'));
      fireEvent.click(screen.getByText('Switch to published'));
      expect(switchWorkflowMode).toHaveBeenCalledWith(false);
    });

    it('should call switchWorkflowMode(true) when "Switch to draft" is clicked', () => {
      const switchWorkflowMode = vi.fn();
      renderCommandBar({ hasDraft: true, isDraftMode: false, switchWorkflowMode });
      fireEvent.click(screen.getByLabelText('More actions'));
      fireEvent.click(screen.getByText('Switch to draft'));
      expect(switchWorkflowMode).toHaveBeenCalledWith(true);
    });

    it('should show "File a bug" menu item', () => {
      renderCommandBar();
      fireEvent.click(screen.getByLabelText('More actions'));
      expect(screen.getByText('File a bug')).toBeDefined();
    });
  });
});
