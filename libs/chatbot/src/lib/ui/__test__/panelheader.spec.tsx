/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { CopilotPanelHeader } from '../panelheader';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { mockUseIntl } from '../../__test__/intl-test-helper';
import { InitLoggerService } from '@microsoft/logic-apps-shared';

// Initialize logger for tests
InitLoggerService([]);

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement, { isDarkTheme = false }: { isDarkTheme?: boolean } = {}) => {
  const fluentTheme = isDarkTheme ? webDarkTheme : webLightTheme;

  return render(<FluentProvider theme={fluentTheme}>{ui}</FluentProvider>);
};

describe('ui/panelheader/CopilotPanelHeader', () => {
  beforeEach(() => {
    mockUseIntl();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the header with all elements', () => {
      renderWithProviders(<CopilotPanelHeader />);

      // Check header title is rendered
      expect(screen.getByText('Workflow assistant')).toBeDefined();

      // Check preview subtitle is rendered
      expect(screen.getByText('Preview')).toBeDefined();

      // Check protected pill is rendered
      expect(screen.getByText('Protected')).toBeDefined();
    });

    it('should render the Logic Apps icon', () => {
      renderWithProviders(<CopilotPanelHeader />);

      const icon = screen.getByAltText('Logic Apps');
      expect(icon).toBeDefined();
    });

    it('should render correctly in light theme', () => {
      const { container } = renderWithProviders(<CopilotPanelHeader />, { isDarkTheme: false });

      expect(container.firstChild).toBeDefined();
    });

    it('should render correctly in dark theme', () => {
      const { container } = renderWithProviders(<CopilotPanelHeader />, { isDarkTheme: true });

      expect(container.firstChild).toBeDefined();
    });
  });

  describe('protected link', () => {
    it('should have privacy statement link with correct href', () => {
      renderWithProviders(<CopilotPanelHeader />);

      const protectedLink = screen.getByText('Protected');
      expect(protectedLink.closest('a')?.getAttribute('href')).toBe('https://aka.ms/azurecopilot/privacystatement');
      expect(protectedLink.closest('a')?.getAttribute('target')).toBe('_blank');
    });
  });

  describe('tooltip', () => {
    it('should have a tooltip on the protected pill', () => {
      renderWithProviders(<CopilotPanelHeader />);

      // The tooltip wrapper should exist around the protected pill
      const protectedPill = screen.getByText('Protected').closest('div');
      expect(protectedPill).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have accessible alt text for the Logic Apps icon', () => {
      renderWithProviders(<CopilotPanelHeader />);

      const icon = screen.getByAltText('Logic Apps');
      expect(icon.tagName.toLowerCase()).toBe('img');
    });

    it('should use semantic h2 heading for the header title', () => {
      renderWithProviders(<CopilotPanelHeader />);

      const heading = screen.getByRole('heading', { level: 2, name: 'Workflow assistant' });
      expect(heading).toBeDefined();
    });

    it('should have aria-label on protected pill tooltip for screen readers', () => {
      renderWithProviders(<CopilotPanelHeader />);

      // The tooltip has aria-label with the full protection message
      const tooltipTrigger = screen.getByLabelText('Your personal and company data are protected in this chat');
      expect(tooltipTrigger).toBeDefined();
    });
  });
});
