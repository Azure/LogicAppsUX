import type { ColorizerProps } from '../index';
import { Colorizer } from '../index';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('lib/colorizer', () => {
  let minimal: ColorizerProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      ariaLabel: 'start time',
      code: '12:00',
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Colorizer {...minimal} />);

    const colorizer = renderer.getRenderOutput();
    expect(colorizer).toMatchSnapshot();
  });

  it('should render when utc time format props are given', () => {
    const toggleUTC = vi.fn();
    renderer.render(<Colorizer {...minimal} utcProps={{ toggleUTC, showUTC: true }} ariaLabel="start time" />);
    const colorizer = renderer.getRenderOutput();
    expect(colorizer).toMatchSnapshot();
    const [buttons]: any[] = React.Children.toArray(colorizer.props.children);
    const [firstButton]: any[] = React.Children.toArray(buttons.props.children);
    const [utcButton]: any[] = React.Children.toArray(firstButton.props.children);
    expect(utcButton.props['aria-label']).toBe(`Switch '${minimal.ariaLabel}' to the local time`);
  });

  it('should call toggleUTC function when UTC button is clicked', () => {
    const toggleUTC = vi.fn();
    renderer.render(<Colorizer {...minimal} utcProps={{ toggleUTC, showUTC: true }} ariaLabel="start time" />);
    const colorizer = renderer.getRenderOutput();
    const [buttons]: any[] = React.Children.toArray(colorizer.props.children);
    const [firstButton]: any[] = React.Children.toArray(buttons.props.children);
    const [utcButton]: any[] = React.Children.toArray(firstButton.props.children);
    utcButton.props.onClick();
    expect(toggleUTC).toHaveBeenCalledTimes(1);
  });
});
