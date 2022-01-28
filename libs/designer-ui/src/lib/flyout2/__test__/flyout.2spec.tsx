import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Flyout2, Flyout2Props } from '..';

describe('ui/flyout2', () => {
  const minimal: Flyout2Props = {
    flyoutExpanded: false,
    flyoutKey: 'flyout-key',
    text: 'text',
  };

  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Flyout2 {...minimal} />);

    const flyout = renderer.getRenderOutput();
    expect(flyout).toBeDefined();
  });

  it("should fire an onClick event when the flyout's info button is clicked", () => {
    const onClick = jest.fn();
    const props: Flyout2Props = { ...minimal, onClick };
    renderer.render(<Flyout2 {...props} />);

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
