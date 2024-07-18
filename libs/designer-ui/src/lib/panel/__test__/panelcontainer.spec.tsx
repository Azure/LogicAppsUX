import { PanelLocation, PanelScope } from '../panelUtil';
import type { PanelContainerProps } from '../panelcontainer';
import { PanelContainer } from '../panelcontainer';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelContainerProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      isCollapsed: false,
      panelLocation: PanelLocation.Right,
      noNodeSelected: false,
      panelScope: PanelScope.CardLevel,
      panelHeaderMenu: [],
      showCommentBox: true,
      tabs: [],
      title: 'test title',
      width: '630px',
      onCommentChange: vi.fn(),
      trackEvent: vi.fn(),
      setSelectedTab: vi.fn(),
      toggleCollapse: vi.fn(),
      onTitleChange: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panel = renderer.render(<PanelContainer {...minimal} />);
    expect(panel).toMatchSnapshot();
  });

  it('should render.', () => {
    renderer.render(<PanelContainer {...minimal} />);
    const panel = renderer.getRenderOutput();

    expect(panel.props.className).toBe('msla-panel-container');
    expect(panel.props.headerClassName).toBe('msla-panel-header');
    expect(panel.props.headerText).toBe(minimal.title);
    expect(panel.props.customWidth).toBe(minimal.width);
  });
});
