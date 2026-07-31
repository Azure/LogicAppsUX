// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CardIndicatorBadges } from '../cardIndicatorBadges';

describe('CardIndicatorBadges', () => {
  it('should render nothing when no indicators are enabled', () => {
    const { container } = render(<CardIndicatorBadges />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the static results indicator when testing is enabled', () => {
    render(<CardIndicatorBadges staticResultsEnabled={true} />);
    expect(screen.getByTestId('card-indicator-badges')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-static-results')).toBeInTheDocument();
  });

  it('should not render the static results indicator when testing is disabled', () => {
    render(<CardIndicatorBadges comment="A comment" staticResultsEnabled={false} />);
    expect(screen.queryByTestId('card-indicator-static-results')).not.toBeInTheDocument();
  });

  it('should render the comment indicator when a comment exists', () => {
    render(<CardIndicatorBadges comment="A comment" />);
    expect(screen.getByTestId('card-indicator-comment')).toBeInTheDocument();
  });

  it('should render the secure inputs/outputs indicator when enabled', () => {
    render(<CardIndicatorBadges isSecureInputsOutputs={true} />);
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toBeInTheDocument();
  });

  it('should not render a loading indicator; the dynamic data spinner stays inline on the card', () => {
    const { container } = render(<CardIndicatorBadges />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('card-indicator-loading-dynamic-data')).not.toBeInTheDocument();
  });

  it('should render every enabled indicator at once', () => {
    render(<CardIndicatorBadges comment="A comment" isSecureInputsOutputs={true} staticResultsEnabled={true} />);
    expect(screen.getByTestId('card-indicator-static-results')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-comment')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toBeInTheDocument();
  });

  it('should label the testing indicator with the tooltip text only, without the card title', () => {
    render(<CardIndicatorBadges staticResultsEnabled={true} />);
    expect(screen.getByTestId('card-indicator-static-results')).toHaveAttribute('aria-label', 'This action has testing configured.');
  });

  it('should label the secure inputs/outputs indicator with the tooltip text only', () => {
    render(<CardIndicatorBadges isSecureInputsOutputs={true} />);
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toHaveAttribute(
      'aria-label',
      'This operation has secure inputs or outputs enabled.'
    );
  });

  it('should label the comment indicator with the raw comment text', () => {
    render(<CardIndicatorBadges comment="A comment" />);
    expect(screen.getByTestId('card-indicator-comment')).toHaveAttribute('aria-label', 'A comment');
  });
});
