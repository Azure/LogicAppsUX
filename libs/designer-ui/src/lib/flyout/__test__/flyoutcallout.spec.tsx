import type { FlyoutCalloutProps } from '../flyoutcallout';
import { FlyoutCallout } from '../flyoutcallout';
import { DirectionalHint } from '@fluentui/react';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('lib/flyout/flyoutcallout', () => {
  let minimal: FlyoutCalloutProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      target: undefined,
      text: 'text',
      visible: true,
      onDismiss: jest.fn(),
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<FlyoutCallout {...minimal} />);

    const callout = renderer.getRenderOutput();
    expect(callout.props).toEqual(
      expect.objectContaining({
        ariaLabel: minimal.text,
        beakWidth: 8,
        className: 'msla-flyout-callout',
        directionalHint: DirectionalHint.rightTopEdge,
        focusTrapProps: {
          isClickableOutsideFocusTrap: true,
        },
        gapSpace: 0,
        setInitialFocus: true,
        target: minimal.target,
      })
    );

    const dialog = React.Children.only(callout.props.children);
    expect(dialog.props.children).toBe(minimal.text);
    expect(dialog.props).toEqual(
      expect.objectContaining({
        'data-is-focusable': true,
        role: 'dialog',
        tabIndex: 0,
      })
    );
  });

  it('should not render when not visible', () => {
    renderer.render(<FlyoutCallout {...minimal} visible={false} />);
    const callout = renderer.getRenderOutput();
    expect(callout).toBeNull();
  });
});
