import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Tip, TipProps } from '..';

describe('ui/tip', () => {
  const classNames = {
    tip: 'msla-tip',
    tipActions: 'msla-tip-actions',
    tipInner: 'msla-tip-inner',
    tipMessage: 'msla-tip-message',
  };

  let minimal: TipProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      message: 'message',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Tip {...minimal} />);

    const callout = renderer.getRenderOutput();
    expect(callout).toBeDefined();
  });

  describe('gapSpace', () => {
    it('should set the gapSpace prop on the callout when gapSpace is set', () => {
      const gapSpace = 32;
      renderer.render(<Tip {...minimal} gapSpace={gapSpace} />);

      const callout = renderer.getRenderOutput();
      expect(callout.props.gapSpace).toBe(gapSpace);
    });

    it('should set the gapSpace prop on the callout to the default value when gapSpace is not set', () => {
      renderer.render(<Tip {...minimal} />);

      const callout = renderer.getRenderOutput();
      expect(callout.props.gapSpace).toStrictEqual(0);
    });
  });

  describe('items', () => {
    it('should render actions', () => {
      const items = [
        {
          children: 'Got it',
          icon: 'CheckMark',
          key: 'got-it',
        },
        {
          children: `Do not show again`,
          icon: 'Cancel',
          key: 'dont-show-again',
        },
      ];
      renderer.render(<Tip {...minimal} items={items} />);

      const callout = renderer.getRenderOutput();
      expect(callout.props.className).toBe(classNames.tip);

      const inner = React.Children.only(callout.props.children);
      expect(inner.props.className).toBe(classNames.tipInner);

      const [, actions]: any[] = React.Children.toArray(inner.props.children); // tslint:disable-line: no-any
      expect(actions.props.className).toBe(classNames.tipActions);

      const [first, second]: any[] = React.Children.toArray(actions.props.children); // tslint:disable-line: no-any
      expect(first.props.children).toBe(items[0].children);
      expect(first.props.icon).toBe(items[0].icon);
      expect(second.props.children).toBe(items[1].children);
      expect(second.props.icon).toBe(items[1].icon);
    });
  });

  describe('message', () => {
    it('should render a message', () => {
      renderer.render(<Tip {...minimal} />);

      const callout = renderer.getRenderOutput();
      expect(callout.props.className).toBe(classNames.tip);

      const inner = React.Children.only(callout.props.children);
      expect(inner.props.className).toBe(classNames.tipInner);

      const [message]: any[] = React.Children.toArray(inner.props.children); // tslint:disable-line: no-any
      expect(message.props.className).toBe(classNames.tipMessage);
      expect(message.props.children).toBe(minimal.message);
    });
  });

  describe('onDismiss', () => {
    it('should set the onDismiss prop on the callout when onDismiss is set', () => {
      const onDismiss = jest.fn();
      renderer.render(<Tip {...minimal} onDismiss={onDismiss} />);

      const callout = renderer.getRenderOutput();
      callout.props.onDismiss();
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
