import { PanelLocation, PanelScope } from '../panelUtil';
import type { PanelContainerProps } from '../panelcontainer';
import { PanelContainer } from '../panelcontainer';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('ui/panel/panelContainer', () => {
  let minimal: PanelContainerProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      node: undefined,
      nodeHeaderItems: [],
      alternateSelectedNode: undefined,
      alternateSelectedNodeHeaderItems: [],
      isCollapsed: false,
      panelLocation: PanelLocation.Right,
      noNodeSelected: false,
      panelScope: PanelScope.CardLevel,
      overrideWidth: '630px',
      onCommentChange: vi.fn(),
      trackEvent: vi.fn(),
      setOverrideWidth: vi.fn(),
      toggleCollapse: vi.fn(),
      onTitleChange: vi.fn(),
      handleTitleUpdate: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const panel = renderer.render(<PanelContainer {...minimal} />);
    expect(panel).toMatchSnapshot();
  });

  it('should render', () => {
    renderer.render(<PanelContainer {...minimal} />);
    const panel = renderer.getRenderOutput();

    expect(panel.props.className).toBe('msla-panel-container');
    expect(panel.props.style).toEqual({ position: 'relative', height: '100%', maxWidth: '100%', width: '614.4px' });
  });
});
