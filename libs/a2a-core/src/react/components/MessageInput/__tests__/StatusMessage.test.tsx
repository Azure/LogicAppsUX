import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusMessage } from '../StatusMessage';

describe('StatusMessage', () => {
  it('should show "Connecting..." when not connected', () => {
    render(<StatusMessage isConnected={false} isTyping={false} hasAuthRequired={false} />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should show "Agent is typing..." when typing, even if auth is required', () => {
    render(<StatusMessage isConnected={true} isTyping={true} hasAuthRequired={true} />);
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
    expect(screen.queryByText('Authentication in progress...')).not.toBeInTheDocument();
  });

  it('should show "Authentication in progress..." when auth is required but not typing', () => {
    render(<StatusMessage isConnected={true} isTyping={false} hasAuthRequired={true} />);
    expect(screen.getByText('Authentication in progress...')).toBeInTheDocument();
    expect(screen.queryByText('Agent is typing...')).not.toBeInTheDocument();
  });

  it('should show nothing when connected, not typing, and no auth required', () => {
    const { container } = render(
      <StatusMessage isConnected={true} isTyping={false} hasAuthRequired={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should prioritize "Connecting..." over all other states', () => {
    render(<StatusMessage isConnected={false} isTyping={true} hasAuthRequired={true} />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.queryByText('Agent is typing...')).not.toBeInTheDocument();
    expect(screen.queryByText('Authentication in progress...')).not.toBeInTheDocument();
  });

  it('should prioritize "Agent is typing..." over "Authentication in progress..."', () => {
    render(<StatusMessage isConnected={true} isTyping={true} hasAuthRequired={true} />);
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
    expect(screen.queryByText('Authentication in progress...')).not.toBeInTheDocument();
  });
});
