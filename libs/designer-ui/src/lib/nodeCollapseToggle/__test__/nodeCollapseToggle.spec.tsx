import React from 'react';
import type { NodeCollapseToggleProps } from '..';
import NodeCollapseToggle from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('lib/nodeCollapseToggle', () => {
  let minimal: NodeCollapseToggleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      id: 'nodeId',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render expanded', () => {
    let collapsed = false;
    const props: NodeCollapseToggleProps = {
      ...minimal,
      collapsed,
      handleCollapse: () => (collapsed = !collapsed),
    };
    renderer.render(<NodeCollapseToggle {...props} />);
    const renderedComponent = renderer.getRenderOutput();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('should render collapsed', () => {
    let collapsed = true;
    const props: NodeCollapseToggleProps = {
      ...minimal,
      collapsed,
      handleCollapse: () => (collapsed = !collapsed),
    };
    renderer.render(<NodeCollapseToggle {...props} />);
    const renderedComponent = renderer.getRenderOutput();
    expect(renderedComponent).toMatchSnapshot();
  });
});
