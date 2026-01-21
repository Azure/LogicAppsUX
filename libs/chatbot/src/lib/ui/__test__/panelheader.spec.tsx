/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { CopilotPanelHeader } from '../panelheader';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { ThemeProvider } from '@fluentui/react';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { mockUseIntl } from '../../__test__/intl-test-helper';
import { initializeIcons } from '@fluentui/react';
import { InitLoggerService } from '@microsoft/logic-apps-shared';

// Initialize icons and logger for tests
initializeIcons();
InitLoggerService([]);

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement, { isDarkTheme = false }: { isDarkTheme?: boolean } = {}) => {
  const fluentTheme = isDarkTheme ? webDarkTheme : webLightTheme;
  const v8Theme = { isInverted: isDarkTheme };

  return render(
    <ThemeProvider theme={v8Theme}>
      <FluentProvider theme={fluentTheme}>{ui}</FluentProvider>
    </ThemeProvider>
  );
};

describe('ui/panelheader/CopilotPanelHeader', () => {
  let closeCopilotMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseIntl();
    closeCopilotMock = vi.fn();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the header with all elements', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      // Check header title is rendered
      expect(screen.getByText('Workflow assistant')).toBeDefined();

      // Check preview subtitle is rendered
      expect(screen.getByText('Preview')).toBeDefined();

      // Check protected pill is rendered
      expect(screen.getByText('Protected')).toBeDefined();

      // Check close button is rendered
      expect(screen.getByTitle('Close')).toBeDefined();
    });

    it('should render the Logic Apps icon', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const icon = screen.getByAltText('Logic Apps');
      expect(icon).toBeDefined();
    });

    it('should render correctly in light theme', () => {
      const { container } = renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />, { isDarkTheme: false });

      expect(container.firstChild).toBeDefined();
    });

    it('should render correctly in dark theme', () => {
      const { container } = renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />, { isDarkTheme: true });

      expect(container.firstChild).toBeDefined();
    });
  });

  describe('close button', () => {
    it('should call closeCopilot when close button is clicked', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(closeCopilotMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('protected link', () => {
    it('should open privacy statement in new tab when Protected link is clicked', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const protectedLink = screen.getByText('Protected');
      fireEvent.click(protectedLink);

      expect(window.open).toHaveBeenCalledWith('https://aka.ms/azurecopilot/privacystatement', '_blank');
    });
  });

  describe('tooltip', () => {
    it('should have a tooltip on the protected pill', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      // The tooltip wrapper should exist around the protected pill
      const protectedPill = screen.getByText('Protected').closest('div');
      expect(protectedPill).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have accessible close button with title attribute', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const closeButton = screen.getByTitle('Close');
      expect(closeButton).toBeDefined();
      expect(closeButton.tagName.toLowerCase()).toBe('button');
    });

    it('should have accessible alt text for the Logic Apps icon', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const icon = screen.getByAltText('Logic Apps');
      expect(icon.tagName.toLowerCase()).toBe('img');
    });

    it('should use semantic h2 heading for the header title', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const heading = screen.getByRole('heading', { level: 2, name: 'Workflow assistant' });
      expect(heading).toBeDefined();
    });

    it('should have aria-label on protected pill tooltip for screen readers', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      // The tooltip has aria-label with the full protection message
      const tooltipTrigger = screen.getByLabelText('Your personal and company data are protected in this chat');
      expect(tooltipTrigger).toBeDefined();
    });

    it('should use semantic button element for close action', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const closeButton = screen.getByTitle('Close');
      expect(closeButton.getAttribute('type')).toBe('button');
    });

    it('should have focusable close button', () => {
      renderWithProviders(<CopilotPanelHeader closeCopilot={closeCopilotMock} />);

      const closeButton = screen.getByTitle('Close');
      // data-is-focusable is used by Fluent UI for focus management
      expect(closeButton.getAttribute('data-is-focusable')).toBe('true');
    });
  });
});
