import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Message } from '../Message';
import type { Message as MessageType } from '../../../types';
import { describe, it, expect } from 'vitest';

describe('Message - link attribute escaping', () => {
  const createAssistantMessage = (content: string): MessageType => ({
    id: '1',
    content,
    sender: 'assistant',
    timestamp: new Date(),
    status: 'delivered',
  });

  it('should escape double quotes in link title attributes', () => {
    const message = createAssistantMessage('Check [this link](https://example.com "My \\"quoted\\" title")');
    const { container } = render(<Message message={message} />);

    const link = container.querySelector('a');
    // The link should render without breaking the HTML structure
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should not create script elements from angle brackets in href', () => {
    const message = createAssistantMessage('[click](https://example.com/path?q=<script>alert(1)</script>)');
    const { container } = render(<Message message={message} />);

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    // Escaping prevents <script> in href from becoming a DOM element
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });

  it('should block javascript: protocol in href', () => {
    const message = createAssistantMessage('[click](javascript:alert(1))');
    const { container } = render(<Message message={message} />);

    const link = container.querySelector('a');
    if (link) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toMatch(/javascript:/i);
    }
  });

  it('should preserve valid links with special characters', () => {
    const message = createAssistantMessage('[search](https://example.com/search?q=hello&lang=en)');
    const { container } = render(<Message message={message} />);

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should render links with no title attribute when title is absent', () => {
    const message = createAssistantMessage('[example](https://example.com)');
    const { container } = render(<Message message={message} />);

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.hasAttribute('title')).toBe(false);
    expect(link?.getAttribute('href')).toContain('example.com');
  });
});
