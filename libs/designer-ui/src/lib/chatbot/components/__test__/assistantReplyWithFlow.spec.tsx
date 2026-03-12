/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AssistantReplyWithFlow } from '../assistantReplyWithFlow';
import { ConversationItemType, UndoStatus } from '../conversationItem';
import type { AssistantReplyWithFlowItem } from '../conversationItem';
import { WorkflowChangeType, WorkflowChangeTargetType } from '@microsoft/logic-apps-shared';
import type { WorkflowChange } from '@microsoft/logic-apps-shared';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from 'react-intl';

vi.mock('../../feedbackHelper', () => ({
  useFeedbackMessage: () => ({
    feedbackMessage: null,
    onMessageReactionClicked: vi.fn(),
    reaction: undefined,
  }),
  useReportBugButton: () => ({
    text: 'Report a bug',
    disabled: false,
    onClick: vi.fn(),
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FluentProvider theme={webLightTheme}>
    <IntlProvider locale="en" messages={{}}>
      {children}
    </IntlProvider>
  </FluentProvider>
);

function makeItem(overrides: Partial<AssistantReplyWithFlowItem> = {}): AssistantReplyWithFlowItem {
  return {
    type: ConversationItemType.ReplyWithFlow,
    id: 'test-reply-1',
    date: new Date('2024-06-01T12:00:00Z'),
    text: 'Your flow has been updated.',
    reaction: undefined,
    undoStatus: UndoStatus.Unavailable,
    __rawRequest: {},
    __rawResponse: {},
    ...overrides,
  };
}

describe('AssistantReplyWithFlow', () => {
  afterEach(() => {
    cleanup();
  });

  describe('text-only rendering (no changes)', () => {
    it('should render markdown text when no changes are present', () => {
      const item = makeItem({ text: 'Your flow has been updated.' });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Your flow has been updated.')).toBeInTheDocument();
    });

    it('should render markdown text when changes array is empty', () => {
      const item = makeItem({ text: 'No changes needed.', changes: [] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('No changes needed.')).toBeInTheDocument();
    });
  });

  describe('change list rendering', () => {
    const addedAction: WorkflowChange = {
      changeType: WorkflowChangeType.Added,
      targetType: WorkflowChangeTargetType.Action,
      nodeIds: ['Send_Email'],
      description: 'Added Send Email action',
      iconUri: 'https://example.com/email-icon.png',
    };

    const modifiedAction: WorkflowChange = {
      changeType: WorkflowChangeType.Modified,
      targetType: WorkflowChangeTargetType.Action,
      nodeIds: ['Delay_Action'],
      description: 'Changed delay to 30 seconds',
    };

    const removedAction: WorkflowChange = {
      changeType: WorkflowChangeType.Removed,
      targetType: WorkflowChangeTargetType.Action,
      nodeIds: ['Old_Step'],
      description: 'Removed Old Step action',
    };

    it('should render change descriptions for each change', () => {
      const item = makeItem({ changes: [addedAction, modifiedAction, removedAction] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Added Send Email action')).toBeInTheDocument();
      expect(screen.getByText('Changed delay to 30 seconds')).toBeInTheDocument();
      expect(screen.getByText('Removed Old Step action')).toBeInTheDocument();
    });

    it('should display node names with labelCase formatting (underscores replaced with spaces)', () => {
      const item = makeItem({ changes: [addedAction] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      // "Send_Email" → "Send Email"
      expect(screen.getByText('Send Email')).toBeInTheDocument();
    });

    it('should render an icon image when iconUri is provided', () => {
      const item = makeItem({ changes: [addedAction] });
      const { container } = render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      const img = container.querySelector('img[src="https://example.com/email-icon.png"]');
      expect(img).toBeInTheDocument();
    });

    it('should render multiple node IDs when a change has multiple affected nodes', () => {
      const multiNodeChange: WorkflowChange = {
        changeType: WorkflowChangeType.Modified,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Step_One', 'Step_Two'],
        description: 'Updated configuration',
      };
      const item = makeItem({ changes: [multiNodeChange] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      // "Step_One" → "Step One, " (with comma separator) and "Step_Two" → "Step Two"
      expect(screen.getByText(/Step One/)).toBeInTheDocument();
      expect(screen.getByText(/Step Two/)).toBeInTheDocument();
    });
  });

  describe('non-action target types', () => {
    it('should display "Note" label for note target type', () => {
      const noteChange: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Note,
        nodeIds: ['note-1'],
        description: 'Added a note',
      };
      const item = makeItem({ changes: [noteChange] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Note')).toBeInTheDocument();
    });

    it('should display "Connection" label for connection target type', () => {
      const connectionChange: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Connection,
        nodeIds: ['conn-1'],
        description: 'Added a connection',
      };
      const item = makeItem({ changes: [connectionChange] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    it('should display "Parameter" label for parameter target type', () => {
      const parameterChange: WorkflowChange = {
        changeType: WorkflowChangeType.Modified,
        targetType: WorkflowChangeTargetType.Parameter,
        nodeIds: ['param-1'],
        description: 'Updated a parameter',
      };
      const item = makeItem({ changes: [parameterChange] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Parameter')).toBeInTheDocument();
    });

    it('should NOT render non-action targets as clickable even when onNodeClick is provided', () => {
      const noteChange: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Note,
        nodeIds: ['note-1'],
        description: 'Added a note',
      };
      const onNodeClick = vi.fn();
      const item = makeItem({ changes: [noteChange], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      // "Note" should not be a link/button
      const noteLabel = screen.getByText('Note');
      expect(noteLabel).not.toHaveAttribute('role', 'button');
    });
  });

  describe('clickable node names', () => {
    it('should make added action nodes clickable when onNodeClick is provided', () => {
      const onNodeClick = vi.fn();
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Send_Email'],
        description: 'Added Send Email',
      };
      const item = makeItem({ changes: [change], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      const nodeName = screen.getByRole('button', { name: /Send Email/i });
      fireEvent.click(nodeName);
      expect(onNodeClick).toHaveBeenCalledWith('Send_Email');
    });

    it('should make modified action nodes clickable when onNodeClick is provided', () => {
      const onNodeClick = vi.fn();
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Modified,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['My_Step'],
        description: 'Modified step',
      };
      const item = makeItem({ changes: [change], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      const nodeName = screen.getByRole('button', { name: /My Step/i });
      fireEvent.click(nodeName);
      expect(onNodeClick).toHaveBeenCalledWith('My_Step');
    });

    it('should NOT make removed action nodes clickable', () => {
      const onNodeClick = vi.fn();
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Removed,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Removed_Step'],
        description: 'Removed step',
      };
      const item = makeItem({ changes: [change], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      // Should render the text, but not as a button
      expect(screen.getByText('Removed Step')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Removed Step/i })).not.toBeInTheDocument();
    });

    it('should support keyboard activation (Enter) on clickable nodes', () => {
      const onNodeClick = vi.fn();
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Step_A'],
        description: 'Added step',
      };
      const item = makeItem({ changes: [change], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      const nodeName = screen.getByRole('button', { name: /Step A/i });
      fireEvent.keyDown(nodeName, { key: 'Enter' });
      expect(onNodeClick).toHaveBeenCalledWith('Step_A');
    });

    it('should support keyboard activation (Space) on clickable nodes', () => {
      const onNodeClick = vi.fn();
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Step_B'],
        description: 'Added step',
      };
      const item = makeItem({ changes: [change], onNodeClick });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      const nodeName = screen.getByRole('button', { name: /Step B/i });
      fireEvent.keyDown(nodeName, { key: ' ' });
      expect(onNodeClick).toHaveBeenCalledWith('Step_B');
    });

    it('should NOT make nodes clickable when onNodeClick is not provided', () => {
      const change: WorkflowChange = {
        changeType: WorkflowChangeType.Added,
        targetType: WorkflowChangeTargetType.Action,
        nodeIds: ['Some_Step'],
        description: 'Added step',
      };
      const item = makeItem({ changes: [change] });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Some Step')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Some Step/i })).not.toBeInTheDocument();
    });
  });

  describe('undo functionality', () => {
    it('should show "Undo" button when undoStatus is UndoAvailable', () => {
      const item = makeItem({
        undoStatus: UndoStatus.UndoAvailable,
        text: 'Changes applied.',
        changes: [
          {
            changeType: WorkflowChangeType.Added,
            targetType: WorkflowChangeTargetType.Action,
            nodeIds: ['X'],
            description: 'Added X',
          },
        ],
      });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('should show "Action undone" when undoStatus is Undone', () => {
      const item = makeItem({
        undoStatus: UndoStatus.Undone,
        text: 'Changes applied.',
      });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.getByText('Action undone')).toBeInTheDocument();
    });

    it('should NOT show undo button when undoStatus is Unavailable', () => {
      const item = makeItem({
        undoStatus: UndoStatus.Unavailable,
        text: 'Changes applied.',
      });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      expect(screen.queryByText('Undo')).not.toBeInTheDocument();
      expect(screen.queryByText('Action undone')).not.toBeInTheDocument();
    });

    it('should open confirmation dialog on Undo click', () => {
      const item = makeItem({
        undoStatus: UndoStatus.UndoAvailable,
        text: 'Changes applied.',
        changes: [
          {
            changeType: WorkflowChangeType.Added,
            targetType: WorkflowChangeTargetType.Action,
            nodeIds: ['X'],
            description: 'Added X',
          },
        ],
      });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      fireEvent.click(screen.getByText('Undo'));
      // The confirmation dialog should appear with "Revert your flow" title
      expect(screen.getByText('Revert your flow')).toBeInTheDocument();
    });

    it('should call item.onClick when confirmation dialog is confirmed', () => {
      const onClick = vi.fn();
      const item = makeItem({
        undoStatus: UndoStatus.UndoAvailable,
        onClick,
        text: 'Changes applied.',
        changes: [
          {
            changeType: WorkflowChangeType.Added,
            targetType: WorkflowChangeTargetType.Action,
            nodeIds: ['X'],
            description: 'Added X',
          },
        ],
      });
      render(
        <TestWrapper>
          <AssistantReplyWithFlow item={item} />
        </TestWrapper>
      );
      fireEvent.click(screen.getByText('Undo'));
      // Click "OK" in the confirmation dialog (Confirm component uses "OK"/"Cancel")
      fireEvent.click(screen.getByText('OK'));
      expect(onClick).toHaveBeenCalledWith('test-reply-1');
    });
  });
});
