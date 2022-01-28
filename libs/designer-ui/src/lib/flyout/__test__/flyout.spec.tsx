import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Flyout, FlyoutProps } from '..';

describe('ui/flyout', () => {
  const classNames = {
    button: 'msla-button',
    flyout: 'msla-flyout',
    flyoutIcon: 'msla-flyout-icon',
  };

  let minimal: FlyoutProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      text: 'text',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const ariaLabel = 'ariaLabel';

    renderer.render(<Flyout {...minimal} ariaLabel={ariaLabel} />);

    const tooltipHost = renderer.getRenderOutput();
    expect(tooltipHost.props.content).toBe(ariaLabel);

    const button = React.Children.only(tooltipHost.props.children);
    expect(button.props['aria-label']).toBe(ariaLabel);
    expect(button.props.className).toContain(classNames.button);
    expect(button.props.className).toContain(classNames.flyout);
    expect(button.props.tabIndex).toBe(Flyout.defaultProps.tabIndex);

    const [icon, callout]: any = React.Children.toArray(button.props.children);
    expect(icon.props.alt).toBe('');
    expect(icon.props.className).toBe(classNames.flyoutIcon);
    expect(icon.props.draggable).toBeFalsy();
    expect(icon.props.role).toBe('presentation');
    expect(callout.props.text).toBe(minimal.text);
    expect(callout.props.visible).toBeFalsy();
  });

  describe('flyout content', () => {
    it('should render flyout content.', () => {
      const onClick = jest.fn();
      renderer.render(<Flyout {...minimal} clickHandler={onClick} />);

      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      const e = {
        preventDefault,
        stopPropagation,
      };
      const tooltipHost = renderer.getRenderOutput();
      const flyout = React.Children.only(tooltipHost.props.children);
      flyout.props.onClick(e);
      expect(onClick).toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should toggle flyout content when clicked again.', () => {
      const onClick = jest.fn();
      renderer.render(<Flyout {...minimal} clickHandler={onClick} />);

      const e = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };
      const tooltipHost = renderer.getRenderOutput();
      const flyout = React.Children.only(tooltipHost.props.children);
      flyout.props.onClick(e);
      flyout.props.onClick(e);
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });
});
