import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { CodeBlockHeader } from '../CodeBlockHeader';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('CodeBlockHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display the language name', () => {
    render(<CodeBlockHeader language="javascript" code="console.log('test');" />);

    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('should copy code to clipboard when copy button is clicked', async () => {
    const testCode = "console.log('Hello, World!');";
    render(<CodeBlockHeader language="javascript" code={testCode} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testCode);
  });

  it('should show "Copied!" feedback after copying', async () => {
    const testCode = "console.log('test');";
    render(<CodeBlockHeader language="typescript" code={testCode} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should revert back to "Copy" after showing copied feedback', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const testCode = "console.log('test');";
    render(<CodeBlockHeader language="python" code={testCode} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });

    // Click the button to trigger copy
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Verify it shows "Copied!"
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    // Fast-forward time by 2 seconds and flush pending timers
    await act(async () => {
      vi.advanceTimersByTime(2000);
      vi.runAllTimers();
    });

    // Now it should be back to "Copy"
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should handle empty language gracefully', () => {
    render(<CodeBlockHeader language="" code="some code" />);

    // Should still render without crashing
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should format language names properly', () => {
    render(<CodeBlockHeader language="typescript" code="const x: number = 5;" />);

    expect(screen.getByText('typescript')).toBeInTheDocument();
  });
});
