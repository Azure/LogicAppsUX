/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

    it('should render the "Some things you can ask" heading', () => {
      render(
        <TestWrapper>
          <AssistantGreeting item={mockItem} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Some things you can ask:').length).toBeGreaterThan(0);
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
});
