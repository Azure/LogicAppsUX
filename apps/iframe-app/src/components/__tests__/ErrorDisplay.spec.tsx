import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ErrorDisplay } from '../ErrorDisplay/ErrorDisplay';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

describe('ErrorDisplay', () => {
  it('should render the title', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Something went wrong" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render the message', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render both title and message', () => {
    renderWithProvider(<ErrorDisplay title="Connection Failed" message="Unable to connect to server" />);

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to server')).toBeInTheDocument();
  });

  it('should render title in an h3 element', () => {
    renderWithProvider(<ErrorDisplay title="Test Error" message="Test message" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Test Error');
  });

  it('should render message in a paragraph element', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Error message content" />);

    const paragraph = screen.getByText('Error message content');
    expect(paragraph.tagName).toBe('P');
  });

  it('should not render details when not provided', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Message" />);

    expect(screen.queryByText(/URL:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Parameters:/)).not.toBeInTheDocument();
  });

  it('should render URL details when provided', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Message" details={{ url: 'https://example.com/api' }} />);

    expect(screen.getByText(/URL:/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example.com\/api/)).toBeInTheDocument();
  });

  it('should render parameters details when provided', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Message" details={{ parameters: 'id=123&type=test' }} />);

    expect(screen.getByText(/Parameters:/)).toBeInTheDocument();
    expect(screen.getByText(/id=123&type=test/)).toBeInTheDocument();
  });

  it('should render both URL and parameters when provided', () => {
    renderWithProvider(
      <ErrorDisplay
        title="Error"
        message="Message"
        details={{
          url: 'https://api.example.com',
          parameters: 'key=value',
        }}
      />
    );

    expect(screen.getByText(/URL:/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/api.example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Parameters:/)).toBeInTheDocument();
    expect(screen.getByText(/key=value/)).toBeInTheDocument();
  });

  it('should handle empty details object', () => {
    renderWithProvider(<ErrorDisplay title="Error" message="Message" details={{}} />);

    expect(screen.queryByText(/URL:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Parameters:/)).not.toBeInTheDocument();
  });

  it('should handle special characters in content', () => {
    renderWithProvider(
      <ErrorDisplay title="Error <500>" message="Failed to load & parse data" details={{ url: 'https://api.example.com?a=1&b=2' }} />
    );

    expect(screen.getByText('Error <500>')).toBeInTheDocument();
    expect(screen.getByText('Failed to load & parse data')).toBeInTheDocument();
  });

  describe('structure', () => {
    it('should have correct DOM structure without details', () => {
      const { container } = renderWithProvider(<ErrorDisplay title="Error" message="Message" />);

      const outerDiv = container.querySelector('div > div');
      expect(outerDiv).toBeInTheDocument();

      const innerDiv = outerDiv?.querySelector('div');
      expect(innerDiv).toBeInTheDocument();

      const h3 = innerDiv?.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveTextContent('Error');

      const p = innerDiv?.querySelector('p');
      expect(p).toBeInTheDocument();
      expect(p).toHaveTextContent('Message');
    });

    it('should have correct DOM structure with details', () => {
      const { container } = renderWithProvider(
        <ErrorDisplay title="Error" message="Message" details={{ url: 'https://test.com', parameters: 'test=1' }} />
      );

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(3); // message + url + parameters
    });

    it('should apply styles via className', () => {
      const { container } = renderWithProvider(<ErrorDisplay title="Error" message="Message" details={{ url: 'test' }} />);

      const outerDiv = container.querySelector('div > div');
      expect(outerDiv).toHaveAttribute('class');

      const h3 = container.querySelector('h3');
      expect(h3).toHaveAttribute('class');

      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach((p) => {
        expect(p).toHaveAttribute('class');
      });
    });
  });
});
