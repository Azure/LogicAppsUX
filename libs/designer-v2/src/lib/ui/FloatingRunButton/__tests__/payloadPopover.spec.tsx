import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { PayloadPopover } from '../payloadPopover';
import { createRef, useRef } from 'react';

// Mock MonacoEditor since it's a complex component
vi.mock('@microsoft/designer-ui', () => ({
  MonacoEditor: ({ value, onContentChanged }: { value?: string; onContentChanged: (e: { value: string }) => void }) => (
    <textarea
      data-testid="monaco-editor"
      aria-label="Body editor"
      value={value ?? ''}
      onChange={(e) => onContentChanged({ value: e.target.value })}
    />
  ),
  SimpleDictionary: function SimpleDictionaryMock({
    value,
    onChange,
  }: {
    value?: Record<string, string>;
    onChange: (val: Record<string, string> | undefined) => void;
  }) {
    // Use a ref to track if this was initially the headers dictionary
    const isHeadersDictRef = useRef<boolean | null>(null);

    // On first render, determine if this is the headers dict based on initial value
    if (isHeadersDictRef.current === null) {
      isHeadersDictRef.current = value?.['Content-Type'] === 'application/json';
    }

    const isHeadersDict = isHeadersDictRef.current;
    const testIdPrefix = isHeadersDict ? 'headers' : 'queries';

    return (
      <div data-testid={`${testIdPrefix}-dictionary`}>
        <input
          data-testid={`${testIdPrefix}-input`}
          aria-label={`${testIdPrefix} value`}
          value={JSON.stringify(value ?? {})}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(undefined);
            }
          }}
        />
        {isHeadersDict && (
          <>
            <button data-testid="clear-headers" type="button" onClick={() => onChange({})}>
              Clear
            </button>
            <button
              data-testid="remove-content-type"
              type="button"
              onClick={() => {
                const newValue = { ...value };
                delete newValue['Content-Type'];
                onChange(Object.keys(newValue).length > 0 ? newValue : undefined);
              }}
            >
              Remove Content-Type
            </button>
            <button data-testid="set-text-content-type" type="button" onClick={() => onChange({ 'Content-Type': 'text/plain' })}>
              Set Text Content-Type
            </button>
            <button data-testid="set-json-content-type" type="button" onClick={() => onChange({ 'Content-Type': 'application/json' })}>
              Set JSON Content-Type
            </button>
          </>
        )}
      </div>
    );
  },
}));

describe('PayloadPopover', () => {
  const mockOnSubmit = vi.fn();
  const mockSetOpen = vi.fn();
  const buttonRef = createRef<HTMLButtonElement>();

  const defaultProps = {
    open: true,
    setOpen: mockSetOpen,
    buttonRef: buttonRef as React.RefObject<HTMLButtonElement>,
    onSubmit: mockOnSubmit,
    isDraftMode: false,
  };

  const renderWithIntl = (props = defaultProps) => {
    return render(
      <IntlProvider locale="en" defaultLocale="en">
        <button ref={buttonRef}>Target</button>
        <PayloadPopover {...props} />
      </IntlProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all form fields when open', () => {
      renderWithIntl();

      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('Headers')).toBeInTheDocument();
      expect(screen.getByText('Queries')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
    });

    it('should render run with payload button text', () => {
      renderWithIntl();

      expect(screen.getByText('Run with payload')).toBeInTheDocument();
    });

    it('should render run draft with payload button text in draft mode', () => {
      renderWithIntl({ ...defaultProps, isDraftMode: true });

      expect(screen.getByText('Run draft with payload')).toBeInTheDocument();
    });

    it('should have default Content-Type header set to application/json', () => {
      renderWithIntl();

      const headersInput = screen.getByTestId('headers-input');
      expect(headersInput).toHaveValue(JSON.stringify({ 'Content-Type': 'application/json' }));
    });
  });

  describe('Body JSON Validation with default Content-Type header', () => {
    it('should show validation error for invalid JSON when Content-Type is application/json', async () => {
      renderWithIntl();

      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{ invalid json' } });

      await waitFor(() => {
        // Check that validation error message is displayed (JSON parse errors contain 'position' or 'line')
        const errorMessage = screen.queryByText(/position \d+|line \d+|Unexpected token/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should not show validation error for valid JSON when Content-Type is application/json', async () => {
      renderWithIntl();

      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{"key": "value"}' } });

      await waitFor(() => {
        // Ensure no error is displayed (no position/line error message)
        const errorMessage = screen.queryByText(/position \d+|line \d+|Unexpected token/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    it('should disable run button when body has invalid JSON and Content-Type is application/json', async () => {
      renderWithIntl();

      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{ invalid' } });

      await waitFor(() => {
        const runButton = screen.getByText('Run with payload');
        expect(runButton).toBeDisabled();
      });
    });

    it('should enable run button when body has valid JSON and Content-Type is application/json', async () => {
      renderWithIntl();

      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{"valid": true}' } });

      await waitFor(() => {
        const runButton = screen.getByText('Run with payload');
        expect(runButton).not.toBeDisabled();
      });
    });

    it('should allow empty body when Content-Type is application/json', async () => {
      renderWithIntl();

      // Body is initially empty, button should be enabled
      const runButton = screen.getByText('Run with payload');
      expect(runButton).not.toBeDisabled();
    });
  });

  describe('Body JSON Validation when Content-Type header is removed', () => {
    it('should NOT validate JSON when Content-Type header is removed', async () => {
      renderWithIntl();

      // Remove the Content-Type header
      const removeContentTypeButton = screen.getByTestId('remove-content-type');
      fireEvent.click(removeContentTypeButton);

      // Now enter invalid JSON
      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{ this is not valid json' } });

      await waitFor(() => {
        // Run button should still be enabled because JSON validation is skipped
        const runButton = screen.getByText('Run with payload');
        expect(runButton).not.toBeDisabled();
      });
    });

    it('should NOT show validation error for invalid JSON when Content-Type header is removed', async () => {
      renderWithIntl();

      // Remove the Content-Type header
      const removeContentTypeButton = screen.getByTestId('remove-content-type');
      fireEvent.click(removeContentTypeButton);

      // Enter invalid JSON
      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{ invalid json here' } });

      await waitFor(() => {
        // No validation error should be shown (no position/line error message)
        const errorMessage = screen.queryByText(/position \d+|line \d+|Unexpected token/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    it('should allow submission with invalid JSON when Content-Type is not application/json', async () => {
      renderWithIntl();

      // Change Content-Type to text/plain
      const setTextContentTypeButton = screen.getByTestId('set-text-content-type');
      fireEvent.click(setTextContentTypeButton);

      // Enter invalid JSON (but valid text)
      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: 'This is plain text, not JSON!' } });

      await waitFor(() => {
        const runButton = screen.getByText('Run with payload');
        expect(runButton).not.toBeDisabled();
      });

      // Click run and verify submission
      const runButton = screen.getByText('Run with payload');
      fireEvent.click(runButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        queries: undefined,
        body: 'This is plain text, not JSON!',
      });
    });
  });

  describe('Body JSON Validation when Content-Type is changed', () => {
    it('should validate JSON when Content-Type is changed back to application/json', async () => {
      renderWithIntl();

      // First, remove Content-Type
      const removeContentTypeButton = screen.getByTestId('remove-content-type');
      fireEvent.click(removeContentTypeButton);

      // Enter invalid JSON (no validation yet)
      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{ invalid' } });

      // Button should be enabled (no validation)
      await waitFor(() => {
        const runButton = screen.getByText('Run with payload');
        expect(runButton).not.toBeDisabled();
      });

      // Now set Content-Type back to application/json
      const setJsonContentTypeButton = screen.getByTestId('set-json-content-type');
      fireEvent.click(setJsonContentTypeButton);

      // Trigger body change to re-validate
      fireEvent.change(editor, { target: { value: '{ still invalid' } });

      // Now validation should kick in and button should be disabled
      await waitFor(() => {
        const runButton = screen.getByText('Run with payload');
        expect(runButton).toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct payload data', async () => {
      renderWithIntl();

      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: '{"test": "data"}' } });

      const runButton = screen.getByText('Run with payload');
      fireEvent.click(runButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        queries: undefined,
        body: '{"test": "data"}',
      });
    });

    it('should close popover after submission', async () => {
      renderWithIntl();

      const runButton = screen.getByText('Run with payload');
      fireEvent.click(runButton);

      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('Reset on Open', () => {
    it('should reset headers to default when popover is reopened', () => {
      const { rerender } = renderWithIntl({ ...defaultProps, open: false });

      // Reopen the popover
      rerender(
        <IntlProvider locale="en" defaultLocale="en">
          <button ref={buttonRef}>Target</button>
          <PayloadPopover {...defaultProps} open={true} />
        </IntlProvider>
      );

      const headersInput = screen.getByTestId('headers-input');
      expect(headersInput).toHaveValue(JSON.stringify({ 'Content-Type': 'application/json' }));
    });
  });
});
