/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AssistantGreeting } from '../assistantGreeting';
import type { AssistantGreetingItem } from '../conversationItem';
import { ConversationItemType, FlowOrigin } from '../conversationItem';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { IntlProvider } from 'react-intl';
import renderer from 'react-test-renderer';

vi.mock('../../feedbackHelper', () => ({
  useFeedbackMessage: () => ({
    feedbackMessage: null,
    onMessageReactionClicked: vi.fn(),
    reaction: undefined,
  }),
}));

const mockItem: AssistantGreetingItem = {
  type: ConversationItemType.Greeting,
  id: 'test-greeting-id',
  date: new Date('2024-01-01T12:00:00Z'),
  origin: FlowOrigin.Default,
  reaction: undefined,
};

const TestWrapper: React.FC<{ children: React.ReactNode; theme?: typeof webLightTheme }> = ({ children, theme = webLightTheme }) => (
  <FluentProvider theme={theme}>
    <IntlProvider locale="en" messages={{}}>
      {children}
    </IntlProvider>
  </FluentProvider>
);

describe('AssistantGreeting', () => {
  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render the greeting message', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Welcome to the workflow assistant!').length).toBeGreaterThan(0);
    });

    it('should render the introduction text', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(
        screen.getAllByText(
          "This assistant can help you learn about your workflows and Azure Logic Apps platform's capabilities and connectors."
        ).length
      ).toBeGreaterThan(0);
    });

    it('should render the "Some things you can try" heading', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Some things you can try:').length).toBeGreaterThan(0);
    });

    it('should render all suggested prompts as list items', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Describe this workflow.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Explain how to receive files from SFTP server.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('How can I call an external endpoint?').length).toBeGreaterThan(0);
      expect(screen.getAllByText('What is the concurrency setting of this workflow?').length).toBeGreaterThan(0);
    });

    it('should render suggested prompts using semantic ul/li elements', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThanOrEqual(4);
    });

    it('should render the outro/disclaimer message', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(
        screen.getAllByText("The workflow assistant is designed only to provide help and doesn't support workflow creation or editing.")
          .length
      ).toBeGreaterThan(0);
    });
  });

  describe('snapshots', () => {
    it('should match snapshot with light theme', () => {
      const tree = renderer
        .create(
          <TestWrapper theme={webLightTheme}>
            <AssistantGreeting item={mockItem} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot with dark theme', () => {
      const tree = renderer
        .create(
          <TestWrapper theme={webDarkTheme}>
            <AssistantGreeting item={mockItem} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('workflowEditingEnabled mode', () => {
    const editingItem: AssistantGreetingItem = {
      ...mockItem,
      workflowEditingEnabled: true,
    };

    it('should render editing-mode introduction text', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(
        screen.getAllByText(
          'This assistant can help you learn about your workflows, answer questions about Azure Logic Apps, and make changes to your workflow.'
        ).length
      ).toBeGreaterThan(0);
    });

    it('should NOT render the default (non-editing) introduction text', () => {
      const { container } = render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      const allText = container.textContent;
      expect(allText).not.toContain(
        "This assistant can help you learn about your workflows and Azure Logic Apps platform's capabilities and connectors."
      );
    });

    it('should render editing-mode suggested prompt for adding a response action', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(screen.getAllByText('Add a response action that returns a 200 status code.').length).toBeGreaterThan(0);
    });

    it('should render editing-mode suggested prompt for adding error handling', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(screen.getAllByText('Add error handling to this workflow.').length).toBeGreaterThan(0);
    });

    it('should NOT render non-editing suggested prompts when editing is enabled', () => {
      const { container } = render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      const allText = container.textContent;
      expect(allText).not.toContain('Explain how to receive files from SFTP server.');
      expect(allText).not.toContain('How can I call an external endpoint?');
    });

    it('should render editing-mode outro message', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(screen.getAllByText('You can ask questions or describe changes you want to make to your workflow.').length).toBeGreaterThan(0);
    });

    it('should NOT render the non-editing disclaimer when editing is enabled', () => {
      const { container } = render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(container.textContent).not.toContain(
        "The workflow assistant is designed only to provide help and doesn't support workflow creation or editing."
      );
    });

    it('should still render shared elements like the greeting and first/fourth prompts', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={editingItem} />
        </TestWrapper>
      );
      expect(screen.getAllByText('Welcome to the workflow assistant!').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Some things you can try:').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Describe this workflow.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('What is the concurrency setting of this workflow?').length).toBeGreaterThan(0);
    });
  });
});
