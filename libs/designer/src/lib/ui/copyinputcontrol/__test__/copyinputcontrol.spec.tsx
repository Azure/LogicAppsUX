import { getTestIntl } from '../../../__test__/intl-test-helper';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { InnerClassCopyInput as CopyInputControl, CopyInputControlProps } from '..';

describe('ui/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      placeholderText: 'URL goes here',
      text: 'http://test.com',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct the copyinputcontrol correctly', () => {
    renderer.render(<CopyInputControl {...minimal} intl={getTestIntl()} />);

    const copyInputControl = renderer.getRenderOutput();
    expect(copyInputControl).toBeDefined();
  });

  it('should render button image correctly', () => {
    renderer.render(<CopyInputControl {...minimal} intl={getTestIntl()} />);

    const copyInputControl = renderer.getRenderOutput();
    const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
    const button = React.Children.only(tooltipHost.props.children);
    expect(button.props.iconProps.iconName).toBe('Copy');
  });

  it('should display text correctly', () => {
    renderer.render(<CopyInputControl {...minimal} intl={getTestIntl()} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.value).toBe(minimal.text);
  });

  it('should display placeholder text correctly when text value is not present', () => {
    renderer.render(<CopyInputControl {...minimal} intl={getTestIntl()} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.placeholder).toBe(minimal.placeholderText);
  });

  it('textbox should be readOnly', () => {
    renderer.render(<CopyInputControl {...minimal} intl={getTestIntl()} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.readOnly).toBeTruthy();
  });

  describe('onClick', () => {
    it('should call onClick handler when Copy command is supported by browser', () => {
      document.queryCommandSupported = jest.fn().mockReturnValue(true);
      const onCopy = jest.fn();
      renderer.render(<CopyInputControl {...minimal} onCopy={onCopy} intl={getTestIntl()} />);

      const copyInputControl = renderer.getRenderOutput();
      const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
      const button = React.Children.only(tooltipHost.props.children);
      expect(button.props.disabled).toBeFalsy();

      button.props.onClick();
      expect(onCopy).toHaveBeenCalled();
    });

    it('should not call onClick handler when Copy command is not supported by browser', () => {
      document.queryCommandSupported = jest.fn().mockReturnValue(false);

      const onCopy = jest.fn();
      renderer.render(<CopyInputControl {...minimal} onCopy={onCopy} intl={getTestIntl()} />);

      const copyInputControl = renderer.getRenderOutput();
      const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
      const button = React.Children.only(tooltipHost.props.children);
      expect(button.props.disabled).toBeTruthy();
    });

    it('should not call onClick handler when queryCommandSupported Fails or a browser', () => {
      const onCopy = jest.fn();
      renderer.render(<CopyInputControl {...minimal} onCopy={onCopy} intl={getTestIntl()} />);

      const copyInputControl = renderer.getRenderOutput();
      const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
      const button = React.Children.only(tooltipHost.props.children);
      expect(button.props.disabled).toBeTruthy();
    });
  });

  describe('ARIA', () => {
    it('should set the aria-labelledby attribute', () => {
      const props: CopyInputControlProps = { ...minimal, ariaLabelledBy: 'aria-labelledby' };
      renderer.render(<CopyInputControl {...props} intl={getTestIntl()} />);

      const copyInputControl = renderer.getRenderOutput();
      const [input]: any = React.Children.toArray(copyInputControl.props.children);
      expect(input.props['aria-labelledby']).toBe(props.ariaLabelledBy);
    });
  });
});
