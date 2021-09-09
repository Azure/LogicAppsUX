import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Flyout, FlyoutProps } from '..';

describe('ui/flyout2', () => {
  const minimal: FlyoutProps = {
    flyoutExpanded: false,
    flyoutKey: 'flyout-key',
    text: 'text',
    trackEvent: jest.fn(),
  };

  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Flyout {...minimal} />);

    const flyout = renderer.getRenderOutput();
    expect(flyout).toBeDefined();
  });

  it("should fire an onClick event when the flyout's info button is clicked", () => {
    const onClick = jest.fn();
    const props: FlyoutProps = { ...minimal, onClick };
    renderer.render(<Flyout {...props} />);

    const flyout = renderer.getRenderOutput();
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const e = {
      preventDefault,
      stopPropagation,
    };
    flyout.props.onClick(e);
    expect(onClick).toHaveBeenCalledWith({ key: props.flyoutKey });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });
});
