import type { ValueLinkProps } from '../valuelink';
import { ValueLink } from '../valuelink';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/monitoring/valuespanel/valuelink', () => {
  let minimal: ValueLinkProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      linkText: 'link-text',
      visible: true,
      onLinkClick: vi.fn(),
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<ValueLink {...minimal} />);

    const link = renderer.getRenderOutput();
    expect(link.props).toEqual(
      expect.objectContaining({
        appearance: 'subtle',
        children: 'link-text',
        className: 'msla-show-raw-button',
        iconPosition: 'after',
      })
    );
  });

  it('should not render when not visible', () => {
    renderer.render(<ValueLink {...minimal} visible={false} />);

    const link = renderer.getRenderOutput();
    expect(link).toBeNull();
  });
});
