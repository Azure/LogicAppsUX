import type { PanelRootProps } from '../panelroot';
import { PanelRoot } from '../panelroot';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelRootProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { collapsed: false, isRecommendation: false, noNodeSelected: false, title: 'Test Title' };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panel = renderer.render(<PanelRoot {...minimal} />);
    expect(panel).toMatchSnapshot();
  });
});
