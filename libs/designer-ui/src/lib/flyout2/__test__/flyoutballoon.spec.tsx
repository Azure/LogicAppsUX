import { DirectionalHint } from '@fluentui/react';
import React from 'react';
import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';
import { FlyoutBalloon, FlyoutBalloonProps } from '../flyoutballoon';

describe('lib/flyout2/flyoutballoon', () => {
  let minimal: FlyoutBalloonProps;

  beforeEach(() => {
    minimal = {
      flyoutExpanded: false,
      target: undefined,
      text: 'text',
    };
  });

  it('should not render when not expanded', () => {
    const tree = renderer.create(<FlyoutBalloon {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('flyoutExpanded', () => {
    let renderer: ShallowRenderer.ShallowRenderer;

    beforeEach(() => {
      renderer = ShallowRenderer.createRenderer();
    });

    afterEach(() => {
      renderer.unmount();
    });

    it('should render when expanded', () => {
      renderer.render(<FlyoutBalloon {...minimal} flyoutExpanded={true} />);

      const balloon = renderer.getRenderOutput();
      expect(balloon.props).toEqual(
        expect.objectContaining({
          beakWidth: 8,
          className: 'msla-flyout-callout',
          directionalHint: DirectionalHint.rightTopEdge,
          gapSpace: 0,
          setInitialFocus: true,
        })
      );

      const dialog = React.Children.only(balloon.props.children);
      expect(dialog.props).toEqual(
        expect.objectContaining({
          'aria-label': minimal.text,
          'data-is-focusable': true,
          role: 'dialog',
          tabIndex: 0,
        })
      );

      const [text]: any[] = React.Children.toArray(dialog.props.children);
      expect(text).toBe(minimal.text);
    });

    it('should render with a documentation link', () => {
      const documentationLink = {
        url: 'https://aka.ms/logicapps-chunk',
      };
      renderer.render(<FlyoutBalloon {...minimal} documentationLink={documentationLink} flyoutExpanded={true} />);

      const balloon = renderer.getRenderOutput();
      const dialog = React.Children.only(balloon.props.children);
      const [, documentationLinkItem]: any[] = React.Children.toArray(dialog.props.children);
      expect(documentationLinkItem.props).toEqual({
        url: documentationLink.url,
      });
    });
  });
});
