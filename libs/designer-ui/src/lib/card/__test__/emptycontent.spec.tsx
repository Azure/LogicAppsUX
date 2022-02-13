import React from 'react';
import { FormattedMessage } from 'react-intl';
import ShallowRenderer from 'react-test-renderer/shallow';
import { EmptyContent } from '../emptycontent';

describe('lib/card/emptycontent', () => {
  let renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<EmptyContent />);

    const content = renderer.getRenderOutput();
    expect(content.props.className).toBe('msla-panel-select-card-container-empty');

    const [icon, text]: any[] = React.Children.toArray(content.props.children);
    expect(icon.props).toEqual(
      expect.objectContaining({
        alt: '',
        role: 'presentation',
      })
    );
    expect(text.props.className).toBe('msla-panel-empty-text');

    const message = React.Children.only(text.props.children);
    expect(message).toEqual(
      <FormattedMessage defaultMessage="Please select a card to see the content" description="Empty Panel Content Message" />
    );
  });
});
