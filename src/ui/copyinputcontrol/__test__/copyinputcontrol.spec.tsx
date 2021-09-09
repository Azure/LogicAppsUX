import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { CopyInputControl, CopyInputControlProps } from '..';

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
    renderer.render(<CopyInputControl {...minimal} />);

    const copyInputControl = renderer.getRenderOutput();
    expect(copyInputControl).toBeDefined();
  });

  it('should render button image correctly', () => {
    renderer.render(<CopyInputControl {...minimal} />);

    const copyInputControl = renderer.getRenderOutput();
    const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
    const button = React.Children.only(tooltipHost.props.children);
    expect(button.props.iconProps.iconName).toBe('Copy');
  });

  it('should display text correctly', () => {
    renderer.render(<CopyInputControl {...minimal} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.value).toBe(minimal.text);
  });

  it('should display placeholder text correctly when text value is not present', () => {
    renderer.render(<CopyInputControl {...minimal} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.placeholder).toBe(minimal.placeholderText);
  });

  it('textbox should be readOnly', () => {
    renderer.render(<CopyInputControl {...minimal} />);

    const copyInputControl = renderer.getRenderOutput();
    const [input]: any = React.Children.toArray(copyInputControl.props.children);
    expect(input.props.readOnly).toBeTruthy();
  });

  describe('onClick', () => {
    it('should call onClick handler when Copy command is supported by browser', () => {
      spyOn(document, 'queryCommandSupported').and.returnValue(true);

      const onCopy = jasmine.createSpy('onCopy');
      renderer.render(<CopyInputControl {...minimal} onCopy={onCopy} />);

      const copyInputControl = renderer.getRenderOutput();
      const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
      const button = React.Children.only(tooltipHost.props.children);
      expect(button.props.disabled).toBeFalsy();

      button.props.onClick();
      expect(onCopy).toHaveBeenCalled();
    });

    it('should not call onClick handler when Copy command is not supported by browser', () => {
      spyOn(document, 'queryCommandSupported').and.returnValue(false);

      const onCopy = jasmine.createSpy('onCopy');
      renderer.render(<CopyInputControl {...minimal} onCopy={onCopy} />);

      const copyInputControl = renderer.getRenderOutput();
      const [, tooltipHost]: any = React.Children.toArray(copyInputControl.props.children);
      const button = React.Children.only(tooltipHost.props.children);
      expect(button.props.disabled).toBeTruthy();
    });
  });

  describe('ARIA', () => {
    it('should set the aria-labelledby attribute', () => {
      const props: CopyInputControlProps = { ...minimal, ariaLabelledBy: 'aria-labelledby' };
      renderer.render(<CopyInputControl {...props} />);

      const copyInputControl = renderer.getRenderOutput();
      const [input]: any = React.Children.toArray(copyInputControl.props.children);
      expect(input.props['aria-labelledby']).toBe(props.ariaLabelledBy);
    });
  });
});
