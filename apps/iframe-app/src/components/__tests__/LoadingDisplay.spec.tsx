import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { LoadingDisplay } from '../LoadingDisplay/LoadingDisplay';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

describe('LoadingDisplay', () => {
  it('should render the title', () => {
    renderWithProvider(<LoadingDisplay title="Loading..." message="Please wait" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render the message', () => {
    renderWithProvider(<LoadingDisplay title="Loading..." message="Please wait" />);

    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('should render both title and message', () => {
    renderWithProvider(<LoadingDisplay title="Initializing" message="Setting up your session..." />);

    expect(screen.getByText('Initializing')).toBeInTheDocument();
    expect(screen.getByText('Setting up your session...')).toBeInTheDocument();
  });

  it('should render title in an h3 element', () => {
    renderWithProvider(<LoadingDisplay title="Test Title" message="Test message" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Test Title');
  });

  it('should render message in a paragraph element', () => {
    renderWithProvider(<LoadingDisplay title="Title" message="Test message content" />);

    const paragraph = screen.getByText('Test message content');
    expect(paragraph.tagName).toBe('P');
  });

  it('should handle empty strings', () => {
    renderWithProvider(<LoadingDisplay title="" message="" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('');
  });

  it('should handle long text content', () => {
    const longTitle = 'A'.repeat(100);
    const longMessage = 'B'.repeat(500);

    renderWithProvider(<LoadingDisplay title={longTitle} message={longMessage} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('should handle special characters in content', () => {
    renderWithProvider(<LoadingDisplay title="Loading <data> & more..." message="Status: 50% complete — almost done!" />);

    expect(screen.getByText('Loading <data> & more...')).toBeInTheDocument();
    expect(screen.getByText('Status: 50% complete — almost done!')).toBeInTheDocument();
  });

  describe('structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = renderWithProvider(<LoadingDisplay title="Loading" message="Please wait..." />);

      const outerDiv = container.querySelector('div > div');
      expect(outerDiv).toBeInTheDocument();

      const innerDiv = outerDiv?.querySelector('div');
      expect(innerDiv).toBeInTheDocument();

      const h3 = innerDiv?.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveTextContent('Loading');

      const p = innerDiv?.querySelector('p');
      expect(p).toBeInTheDocument();
      expect(p).toHaveTextContent('Please wait...');
    });

    it('should apply styles via className', () => {
      const { container } = renderWithProvider(<LoadingDisplay title="Test" message="Test message" />);

      const outerDiv = container.querySelector('div > div');
      expect(outerDiv).toHaveAttribute('class');

      const h3 = container.querySelector('h3');
      expect(h3).toHaveAttribute('class');

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('class');
    });
  });
});
