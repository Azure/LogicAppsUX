import { render, screen } from '@testing-library/react';
import { CopyTooltip, CopyTooltipProps } from '../CopyTooltip';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import React from 'react';

vi.mock('@xyflow/react', () => ({
  useOnViewportChange: vi.fn(),
}));

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
  const hideTooltipMock = vi.fn();

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

  it('should display the tooltip on hover', () => {
    const copiedText = 'Copied!';
    const location = { x: 100, y: 100 };

    // Render the Tooltip component
    const { baseElement } = renderComponent({ location });
    expect(baseElement).toMatchSnapshot();

    // Get the tooltip div and the location div
    const tooltipDiv = screen.getByRole('tooltip');
    const tooltipLocationDiv = screen.getByTestId('msla-tooltip-location');

    // Assert that the tooltip and location div are rendered correctly
    expect(tooltipDiv).toBeInTheDocument();
    expect(screen.getByText(copiedText)).toBeVisible();
    expect(tooltipLocationDiv).toBeInTheDocument();
    expect(tooltipLocationDiv).toHaveStyle({ position: 'absolute', top: '100px', left: '100px' });
  });

  // it('should render the tooltip with the correct content', () => {
  //   const { asFragment } = renderComponent();
  //   expect(asFragment()).toMatchSnapshot();

  //   // expect(screen.getByText('Copied!')).toBeInTheDocument();
  // });

  // it('should render the tooltip with the correct content', () => {
  //   const { asFragment } = renderComponent();
  //   expect(asFragment()).toMatchSnapshot();

  //   expect(screen.getByText('Copied!')).toBeInTheDocument();
  // });

  // it('should call hideTooltip on viewport change', () => {
  //   renderComponent();
  //   expect(useOnViewportChange).toHaveBeenCalledWith({ onStart: hideTooltipMock });
  // });

  // it('should position the tooltip based on the provided location', () => {
  //   const location = { x: 100, y: 200 };
  //   renderComponent({ location });

  //   const tooltipDiv = screen.getByRole('tooltip').parentElement;
  //   expect(tooltipDiv).toHaveStyle({ position: 'absolute', top: '200px', left: '100px' });
  // });

  // it('should use the targetRef if provided', () => {
  //   const targetRef = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
  //   renderComponent({ targetRef });

  //   expect(screen.getByRole('tooltip').parentElement).toBe(targetRef.current);
  // });

  // it('should default to locationRef if targetRef is not provided', () => {
  //   renderComponent();

  //   const tooltipDiv = screen.getByRole('tooltip').parentElement;
  //   expect(tooltipDiv).toHaveStyle({ position: 'absolute', top: '0px', left: '0px' });
  // });

  // // it('should call hideTooltip on viewport change', () => {
  // //   const copyTooltip = renderComponent();
  // //   expect(copyTooltip).toMatchSnapshot();

  // //   expect(useOnViewportChange).toHaveBeenCalledWith({ onStart: hideTooltipMock });
  // // });

  // it('should position the tooltip based on the provided location', () => {
  //   const location = { x: 100, y: 200 };
  //   const { asFragment } = renderComponent({location});
  //   expect(asFragment()).toMatchSnapshot();

  //   const tooltipDiv = screen.getByRole('tooltip');
  //   console.log('charlie', tooltipDiv);
  //   expect(tooltipDiv).toHaveStyle({ position: 'absolute', top: '200px', left: '100px' });
  // });

  // // it('should use the targetRef if provided', () => {
  // //   const targetRef = { current: document.createElement('div') } as React.RefObject<HTMLElement>;
  // //   renderComponent({ targetRef });

  // //   expect(screen.getByRole('tooltip').parentElement).toBe(targetRef.current);
  // // });

  // // it('should default to locationRef if targetRef is not provided', () => {
  // //   renderComponent();

  // //   const tooltipDiv = screen.getByRole('tooltip').parentElement;
  // //   expect(tooltipDiv).toHaveStyle({ position: 'absolute', top: '0px', left: '0px' });
  // // });
});
