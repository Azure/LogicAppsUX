import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Badge } from '../badge';

describe('ui/recommendation3/_badge', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should not render when not visible', () => {
    renderer.render(<Badge text="Preview" visible={false} />);

    const badge = renderer.getRenderOutput();
    expect(badge).toBeNull();
  });

  it('should render when visible', () => {
    renderer.render(<Badge text="Preview" visible={true} />);

    const badge = renderer.getRenderOutput();
    expect(badge.type).toBe('span');
    expect(badge.props.children).toBe('Preview');
  });

  it('should render with a CSS class when specified', () => {
    renderer.render(<Badge className="msla-premium" text="Premium" visible={true} />);

    const badge = renderer.getRenderOutput();
    expect(badge.type).toBe('span');
    expect(badge.props.className).toBe('msla-premium');
    expect(badge.props.children).toBe('Premium');
  });

  it('should render the correct tag when specified', () => {
    renderer.render(<Badge className="msla-ise" tag="div" text="ISE" visible={true} title="ISE connector" />);

    const badge = renderer.getRenderOutput();
    expect(badge.type).toBe('div');
    expect(badge.props.className).toBe('msla-ise');
    expect(badge.props.title).toBe('ISE connector');
    expect(badge.props.children).toBe('ISE');
  });
});
