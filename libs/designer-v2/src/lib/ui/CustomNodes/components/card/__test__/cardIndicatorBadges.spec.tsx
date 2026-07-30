// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CardIndicatorBadges } from '../cardIndicatorBadges';

describe('CardIndicatorBadges', () => {
  it('should render nothing when no indicators are enabled', () => {
    const { container } = render(<CardIndicatorBadges cardTitle="Test Action" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the static results indicator when testing is enabled', () => {
    render(<CardIndicatorBadges cardTitle="Test Action" staticResultsEnabled={true} />);
    expect(screen.getByTestId('card-indicator-badges')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-static-results')).toBeInTheDocument();
  });

  it('should not render the static results indicator when testing is disabled', () => {
    render(<CardIndicatorBadges cardTitle="Test Action" comment="A comment" staticResultsEnabled={false} />);
    expect(screen.queryByTestId('card-indicator-static-results')).not.toBeInTheDocument();
  });

  it('should render the comment indicator when a comment exists', () => {
    render(<CardIndicatorBadges cardTitle="Test Action" comment="A comment" />);
    expect(screen.getByTestId('card-indicator-comment')).toBeInTheDocument();
  });

  it('should render the secure inputs/outputs indicator when enabled', () => {
    render(<CardIndicatorBadges cardTitle="Test Action" isSecureInputsOutputs={true} />);
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toBeInTheDocument();
  });

  it('should render a spinner when dynamic data is loading', () => {
    render(<CardIndicatorBadges cardTitle="Test Action" isLoadingDynamicData={true} />);
    expect(screen.getByTestId('card-indicator-loading-dynamic-data')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('should render every enabled indicator at once', () => {
    render(
      <CardIndicatorBadges
        cardTitle="Test Action"
        comment="A comment"
        isLoadingDynamicData={true}
        isSecureInputsOutputs={true}
        staticResultsEnabled={true}
      />
    );
    expect(screen.getByTestId('card-indicator-loading-dynamic-data')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-static-results')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-comment')).toBeInTheDocument();
    expect(screen.getByTestId('card-indicator-secure-inputs-outputs')).toBeInTheDocument();
  });
});
