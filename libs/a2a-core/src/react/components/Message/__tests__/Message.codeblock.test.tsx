import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { Message } from '../Message';
import type { Message as MessageType } from '../../../types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('Message - Code Block Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show language and copy button for code blocks in markdown', () => {
    const message: MessageType = {
      id: '1',
      content: '```javascript\nconsole.log("Hello, World!");\n```',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
    };

    render(<Message message={message} />);

    // Check for language label
    expect(screen.getByText('javascript')).toBeInTheDocument();

    // Check for copy button
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should show headers for multiple code blocks', () => {
    const message: MessageType = {
      id: '1',
      content: `Here's some JavaScript:
\`\`\`javascript
const greeting = "Hello";
\`\`\`

And here's some Python:
\`\`\`python
greeting = "Hello"
\`\`\``,
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
    };

    render(<Message message={message} />);

    // Should have two language labels
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();

    // Should have two copy buttons
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(2);
  });

  it('should copy code when copy button is clicked', async () => {
    const codeContent = 'console.log("Test code");';
    const message: MessageType = {
      id: '1',
      content: `\`\`\`javascript\n${codeContent}\n\`\`\``,
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
    };

    render(<Message message={message} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(codeContent);
  });

  it('should handle code blocks without language specified', () => {
    const message: MessageType = {
      id: '1',
      content: '```\nplain code block\n```',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
    };

    render(<Message message={message} />);

    // Should still have a copy button
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should not show code block header for inline code', () => {
    const message: MessageType = {
      id: '1',
      content: 'Use the `console.log()` function to debug.',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
    };

    render(<Message message={message} />);

    // Should not have a copy button for inline code
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('should show code block header for artifact code', () => {
    const artifactContent = 'function test() { return "Hello"; }';
    const message: MessageType = {
      id: '1',
      content: 'Generated code',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'delivered',
      metadata: {
        isArtifact: true,
        artifactName: 'test.js',
        rawContent: artifactContent,
        isCodeFile: true,
      },
    };

    render(<Message message={message} />);

    // Click the view button to show content
    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);

    // Check for language label (derived from filename)
    expect(screen.getByText('javascript')).toBeInTheDocument();

    // Check for copy button
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
});
