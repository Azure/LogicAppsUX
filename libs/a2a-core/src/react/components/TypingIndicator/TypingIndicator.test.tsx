import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders with default agent name', () => {
    render(<TypingIndicator />);

    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders with custom agent name', () => {
    render(<TypingIndicator agentName="AI Assistant" />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders three animated dots', () => {
    const { container } = render(<TypingIndicator />);

    const dots = container.querySelectorAll('.dot');
    expect(dots).toHaveLength(3);
  });

  it('applies correct CSS classes to structure', () => {
    const { container } = render(<TypingIndicator />);

    const indicatorElement = container.querySelector('.typingIndicator');
    const containerElement = container.querySelector('.typingContainer');
    const senderNameElement = container.querySelector('.senderName');
    const bubbleElement = container.querySelector('.typingBubble');

    expect(indicatorElement).toBeInTheDocument();
    expect(containerElement).toBeInTheDocument();
    expect(senderNameElement).toBeInTheDocument();
    expect(bubbleElement).toBeInTheDocument();
  });

  it('renders correct DOM structure', () => {
    const { container } = render(<TypingIndicator agentName="Bot" />);

    // Check overall structure
    const typingIndicator = container.firstChild as HTMLElement;
    expect(typingIndicator).toHaveClass('typingIndicator');

    // Check container structure
    const typingContainer = typingIndicator.firstChild as HTMLElement;
    expect(typingContainer).toHaveClass('typingContainer');

    // Check sender name
    const senderName = typingContainer.firstChild as HTMLElement;
    expect(senderName).toHaveClass('senderName');
    expect(senderName).toHaveTextContent('Bot');

    // Check typing bubble
    const typingBubble = typingContainer.lastChild as HTMLElement;
    expect(typingBubble).toHaveClass('typingBubble');

    // Check dots are spans
    const dots = typingBubble.children;
    expect(dots).toHaveLength(3);
    Array.from(dots).forEach((dot) => {
      expect(dot.tagName).toBe('SPAN');
      expect(dot).toHaveClass('dot');
    });
  });

  it('handles empty string agent name', () => {
    render(<TypingIndicator agentName="" />);

    // Should still render the senderName element even if empty
    const { container } = render(<TypingIndicator agentName="" />);
    const senderNameElement = container.querySelector('.senderName');
    expect(senderNameElement).toBeInTheDocument();
    expect(senderNameElement).toHaveTextContent('');
  });

  it('handles very long agent names', () => {
    const longName = 'This is a very long agent name that might cause layout issues';
    render(<TypingIndicator agentName={longName} />);

    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('renders dots as empty spans for CSS animation', () => {
    const { container } = render(<TypingIndicator />);

    const dots = container.querySelectorAll('.dot');
    dots.forEach((dot) => {
      expect(dot).toHaveTextContent(''); // Dots should be empty for CSS animation
    });
  });

  it('maintains consistent structure regardless of agent name', () => {
    const { container: container1 } = render(<TypingIndicator />);
    const { container: container2 } = render(<TypingIndicator agentName="Different Name" />);

    // Both should have same number of elements
    const elements1 = container1.querySelectorAll('*');
    const elements2 = container2.querySelectorAll('*');

    expect(elements1.length).toBe(elements2.length);
  });
});
