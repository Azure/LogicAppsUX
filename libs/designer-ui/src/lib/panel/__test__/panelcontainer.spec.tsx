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
      node: undefined,
      nodeHeaderItems: [],
      pinnedNode: undefined,
      pinnedNodeHeaderItems: [],
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
    expect(panel.props.style).toEqual({ position: 'absolute', width: minimal.overrideWidth });
  });
});
