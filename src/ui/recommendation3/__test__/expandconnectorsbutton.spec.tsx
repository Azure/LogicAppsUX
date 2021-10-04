import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { ExpandConnectorsButton, ExpandConnectorsButtonProps } from '../expandconnectorsbutton';

describe('ui/recommendation3/_expandconnectorsbutton', () => {
  const classNames = {
    button: 'msla-expand-button',
  };

  let minimal: ExpandConnectorsButtonProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      visible: true,
      onExpandConnectorsClick: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render when showing both connectors and operations', () => {
    renderer.render(<ExpandConnectorsButton {...minimal} />);

    const tooltipHost = renderer.getRenderOutput();
    expect(tooltipHost.props.content).toBe('Expand list of connectors');

    const button = React.Children.only(tooltipHost.props.children);
    expect(button.props['aria-label']).toBe('Expand list of connectors');
    expect(button.props.className).toBe(classNames.button);
    expect(button.props.onClick).toEqual(minimal.onExpandConnectorsClick);

    const icon = React.Children.only(button.props.children);
    expect(icon.props.iconName).toBe('ChevronDown');
  });

  it('should not render when not visible', () => {
    const props = { ...minimal, visible: false };
    renderer.render(<ExpandConnectorsButton {...props} />);

    const button = renderer.getRenderOutput();
    expect(button).toBeNull();
  });
});
