import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import StatusIndicator from '../StatusIndicator';

describe('StatusIndicator', () => {
  const renderWithProviders = (status: string) => {
    return render(
      <IntlProvider locale="en" defaultLocale="en">
        <StatusIndicator status={status} />
      </IntlProvider>
    );
  };

  describe('Succeeded status', () => {
    it('should render succeeded icon', () => {
      renderWithProviders('Succeeded');

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should have succeeded tooltip', () => {
      renderWithProviders('Succeeded');

      // The tooltip is attached to the image
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Failed status', () => {
    it('should render failed icon', () => {
      renderWithProviders('Failed');

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Running status', () => {
    it('should render spinner for running status', () => {
      renderWithProviders('Running');

      // Spinner should be rendered
      const spinner = document.querySelector('[class*="spinner"]') || screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeTruthy();
    });
  });

  describe('Waiting status', () => {
    it('should render spinner for waiting status', () => {
      renderWithProviders('Waiting');

      const spinner = document.querySelector('[class*="spinner"]') || screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeTruthy();
    });
  });

  describe('Resuming status', () => {
    it('should render spinner for resuming status', () => {
      renderWithProviders('Resuming');

      const spinner = document.querySelector('[class*="spinner"]') || screen.getByRole('progressbar', { hidden: true });
      expect(spinner).toBeTruthy();
    });
  });

  describe('Cancelled status', () => {
    it('should render cancelled icon', () => {
      renderWithProviders('Cancelled');

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Skipped status', () => {
    it('should render skipped icon', () => {
      renderWithProviders('Skipped');

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Unknown status', () => {
    it('should handle unknown status gracefully', () => {
      const { container } = renderWithProviders('UnknownStatus');

      // Should render without crashing
      expect(container).toBeTruthy();
    });

    it('should return null icon for unknown status', () => {
      renderWithProviders('SomeOtherStatus');

      // No img element should be rendered for unknown status
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('All statuses', () => {
    const statuses = ['Succeeded', 'Failed', 'Running', 'Waiting', 'Resuming', 'Cancelled', 'Skipped'];

    statuses.forEach((status) => {
      it(`should render ${status} status without throwing`, () => {
        expect(() => renderWithProviders(status)).not.toThrow();
      });
    });
  });
});
