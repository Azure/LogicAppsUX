import React from 'react';
import { AddActionCard, ADD_CARD_TYPE } from '../index';
import type { AddActionCardProps } from '../index';
import { render, screen } from '@testing-library/react';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { IntlProvider } from 'react-intl';

// Mock the card utils
vi.mock('../../utils', () => ({
  getCardStyle: vi.fn(() => ({})),
}));

// Mock the hooks
vi.mock('../../hooks', () => ({
  useCardKeyboardInteraction: vi.fn(() => ({
    keyDown: vi.fn(),
    keyUp: vi.fn(),
  })),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en" messages={{}}>
    {children}
  </IntlProvider>
);

describe('AddActionCard', () => {
  let minimal: AddActionCardProps;

  beforeEach(() => {
    minimal = {
      addCardType: ADD_CARD_TYPE.TRIGGER,
      onClick: vi.fn(),
      selected: false,
    };
  });

  it('should render trigger card with accessible aria-label including tooltip content', () => {
    render(
      <TestWrapper>
        <AddActionCard {...minimal} />
      </TestWrapper>
    );

    const cardElement = screen.getByTestId('card-Add a trigger');
    const ariaLabel = cardElement.getAttribute('aria-label');

    // Verify that the aria-label includes both the title and tooltip information
    expect(ariaLabel).toContain('Add a trigger');
    expect(ariaLabel).toContain('Triggers');
    expect(ariaLabel).toContain('tell your app when to start running');
    expect(ariaLabel).toContain('Each workflow needs at least one trigger');
  });

  it('should render action card with accessible aria-label including tooltip content', () => {
    const props = {
      ...minimal,
      addCardType: ADD_CARD_TYPE.ACTION,
    };

    render(
      <TestWrapper>
        <AddActionCard {...props} />
      </TestWrapper>
    );

    const cardElement = screen.getByTestId('card-Add an action');
    const ariaLabel = cardElement.getAttribute('aria-label');

    // Verify that the aria-label includes both the title and tooltip information
    expect(ariaLabel).toContain('Add an action');
    expect(ariaLabel).toContain('Actions');
    expect(ariaLabel).toContain('perform operations on data');
    expect(ariaLabel).toContain('communicate between systems');
  });

  it('should have aria-describedby attribute for tooltip association', () => {
    render(
      <TestWrapper>
        <AddActionCard {...minimal} />
      </TestWrapper>
    );

    const cardElement = screen.getByTestId('card-Add a trigger');
    const ariaDescribedBy = cardElement.getAttribute('aria-describedby');

    expect(ariaDescribedBy).toBe('placeholder-node-Trigger');
  });

  it('should be focusable with tabIndex', () => {
    render(
      <TestWrapper>
        <AddActionCard {...minimal} />
      </TestWrapper>
    );

    const cardElement = screen.getByTestId('card-Add a trigger');
    expect(cardElement).toHaveAttribute('tabIndex', '0');
  });
});
