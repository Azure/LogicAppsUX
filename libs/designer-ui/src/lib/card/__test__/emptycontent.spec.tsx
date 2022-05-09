import { EmptyContent } from '../emptycontent';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';

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

    expect(text.props.children).toEqual('Please select a card to see the content');
  });
});
