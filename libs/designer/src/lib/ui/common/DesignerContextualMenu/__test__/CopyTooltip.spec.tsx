import { render, screen } from '@testing-library/react';
import { CopyTooltip, CopyTooltipProps } from '../CopyTooltip';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import React from 'react';

const hideTooltipMock = vi.fn();

vi.mock('@xyflow/react', async () => {
  const actualIntl = await vi.importActual('@xyflow/react');
  return {
    ...actualIntl,
    useOnViewportChange: vi.fn(() => ({ onStart: hideTooltipMock })),
  };
});

vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(() => 'Copied!'),
    }),
  };
});

describe('CopyTooltip', () => {
  beforeAll(() => {
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<CopyTooltipProps> = {}) => {
    const defaultProps: CopyTooltipProps = {
      hideTooltip: hideTooltipMock,
      id: 'test-id',
      ...props,
    };

    return render(<CopyTooltip {...defaultProps} />);
  };

  it('should render the tooltip with the correct content', () => {
    const copiedText = 'Copied!';
    const location = { x: 100, y: 100 };

    // Render the Tooltip component
    const { baseElement } = renderComponent({ location });

    // Get the tooltip div and the location div
    const tooltipDiv = screen.getByRole('tooltip');
    const tooltipLocationDiv = screen.getByTestId('msla-tooltip-location-test_id');

    // Assert that the tooltip and location div are rendered correctly
    expect(tooltipDiv).toBeInTheDocument();
    expect(screen.getByText(copiedText)).toBeVisible();
    expect(tooltipLocationDiv).toBeInTheDocument();
    expect(baseElement).toMatchSnapshot();
  });

  it('should position the tooltip based on the provided location', () => {
    const location = { x: 100, y: 100 };

    // Render the Tooltip component
    const { baseElement } = renderComponent({ location });

    // Get the tooltip location div
    const tooltipLocationDiv = screen.getByTestId('msla-tooltip-location-test_id');

    // Assert that the location div are rendered correctly
    expect(tooltipLocationDiv).toBeInTheDocument();
    expect(tooltipLocationDiv).toHaveStyle({ position: 'absolute', top: '100px', left: '100px' });
    expect(baseElement).toMatchSnapshot();
  });

  it('should default to locationRef if targetRef is not provided', () => {
    renderComponent();

    const tooltipDiv = screen.getByRole('tooltip').parentElement;
    expect(tooltipDiv).toHaveStyle({ position: 'absolute', top: '0px', left: '0px' });
  });
});
