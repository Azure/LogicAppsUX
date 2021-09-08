import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { ActionButton, ActionButtonProps } from '..';

describe('ui/actionbutton', () => {
  const classNames = {
    button: 'msla-action-button',
    buttonText: 'msla-action-button-text',
    infoBalloon: 'info-balloon',
  };

  let minimalProps: ActionButtonProps, renderer: ReactShallowRenderer.ShallowRenderer, trackEvent: any;

  beforeEach(() => {
    trackEvent = jest.fn();
    minimalProps = {
      icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      text: 'Add step',
      trackEvent,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    renderer.render(<ActionButton {...minimalProps} />);

    const actionButton = renderer.getRenderOutput();
    expect(actionButton).toBeDefined();
  });

  it('should render', () => {
    renderer.render(<ActionButton {...minimalProps} />);

    const actionButton = renderer.getRenderOutput();
    expect(/msla-action-button/.test(actionButton.props.className)).toBeTruthy();
  });

  it('should render info balloon correctly', () => {
    const props = { ...minimalProps, infoBalloon: 'info balloon' };
    renderer.render(<ActionButton {...props} />);

    const actionButton = renderer.getRenderOutput();
    const children = React.Children.toArray(actionButton.props.children);
    expect(children.length).toBe(3);

    const infoBalloonContainer: any = children[2]; // tslint:disable-line: no-any
    expect(infoBalloonContainer.props.className).toBe(classNames.infoBalloon);

    const infoBalloon = React.Children.only(infoBalloonContainer.props.children);
    expect(infoBalloon.props.alt).toBe(props.infoBalloon);
    expect(infoBalloon.props.title).toBe(props.infoBalloon);
  });

  describe('disabled', () => {
    it('should not disable the ActionButton when disabled flag is not present', () => {
      renderer.render(<ActionButton {...minimalProps} />);

      const actionButton = renderer.getRenderOutput();
      expect(actionButton.props.disabled).toBeFalsy();
    });

    it('should disable the ActionButton when disabled flag is true', () => {
      const props = { ...minimalProps, disabled: true };
      renderer.render(<ActionButton {...props} />);

      const actionButton = renderer.getRenderOutput();
      expect(actionButton.props.disabled).toBeTruthy();
    });

    it('should not disable the ActionButton when disabled flag is false', () => {
      const props = { ...minimalProps, disabled: false };
      renderer.render(<ActionButton {...props} />);

      const actionButton = renderer.getRenderOutput();
      expect(actionButton.props.disabled).toBeFalsy();
    });
  });

  describe('onClick', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      const props = { ...minimalProps, onClick };
      renderer.render(<ActionButton {...props} />);

      const actionButton: React.ReactElement<ActionButtonProps> = renderer.getRenderOutput();
      const e: any = {
        // tslint:disable-line: no-any
        preventDefault: jest.fn(),
      };
      actionButton?.props?.onClick && actionButton.props.onClick(e);
      expect(onClick).toHaveBeenCalled();
    });
  });
});
