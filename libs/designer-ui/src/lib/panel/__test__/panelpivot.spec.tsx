import type { PanelPivotProps } from '../panelpivot';
import { PanelPivot } from '../panelpivot';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelPivotProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      isCollapsed: false,
      tabs: {},
      onTabChange: jest.fn(),
      trackEvent: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panelPivot = renderer.render(<PanelPivot {...minimal} />);
    expect(panelPivot).toMatchSnapshot();
  });

  it('should render when no tabs.', () => {
    renderer.render(<PanelPivot {...minimal} />);
    const panelPivot = renderer.getRenderOutput();

    expect(panelPivot.props.className).toBe('msla-pivot');

    const pivotMenu = panelPivot.props.children;

    expect(pivotMenu.props.className).toBe('msla-panel-menu');
    expect(pivotMenu.props.overflowAriaLabel).toBe('more panels');
    expect(pivotMenu.props.children).toHaveLength(Object.keys(minimal.tabs).length);
  });

  it('should render menu items when passed tabs.', () => {
    // TODO: 13865562 When Tabs get setup
  });
});
