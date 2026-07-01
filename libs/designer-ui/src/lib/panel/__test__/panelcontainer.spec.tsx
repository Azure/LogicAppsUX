import { PanelLocation, PanelScope } from '../panelUtil';
import type { PanelContainerProps } from '../panelcontainer';
import { PanelContainer } from '../panelcontainer';
import { PanelHeader } from '../panelheader/panelheader';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('ui/panel/panelContainer', () => {
  let minimal: PanelContainerProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      node: {
        comment: undefined,
        displayName: 'Node Title',
        errorMessage: undefined,
        iconUri: '',
        isError: false,
        isLoading: false,
        nodeId: 'nodeId',
        onSelectTab: vi.fn(),
        runData: undefined,
        selectedTab: undefined,
        subgraphType: undefined,
        tabs: [],
      },
      alternateSelectedNodePersistence: 'selected',
      nodeHeaderItems: [],
      alternateSelectedNode: undefined,
      alternateSelectedNodeHeaderItems: [],
      isCollapsed: false,
      panelLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      overrideWidth: '630px',
      onCommentChange: vi.fn(),
      trackEvent: vi.fn(),
      setOverrideWidth: vi.fn(),
      onClose: vi.fn(),
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
    expect(panel.props.style).toEqual({ position: 'relative', height: '100%', maxWidth: '100%', width: '480px' });
  });

  const makeNode = (nodeId: string) => ({
    comment: undefined,
    displayName: nodeId,
    errorMessage: undefined,
    iconUri: '',
    isError: false,
    isLoading: false,
    nodeId,
    onSelectTab: vi.fn(),
    runData: undefined,
    selectedTab: undefined,
    subgraphType: undefined,
    tabs: [],
  });

  const nestedContainer = (panel: any) => {
    const children = Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children];
    return children.find((child: any) => child?.props?.className?.includes('msla-panel-container-nested'));
  };

  const findPanelHeaders = (element: any): any[] => {
    if (!element?.props) {
      return [];
    }

    const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
    const childHeaders = children.flatMap(findPanelHeaders);

    return element.type === PanelHeader ? [element, ...childHeaders] : childHeaders;
  };

  it('should render the dual view when a selected node and a distinct pinned node are both present', () => {
    const props: PanelContainerProps = {
      ...minimal,
      alternateSelectedNode: makeNode('altNodeId'),
      alternateSelectedNodePersistence: 'pinned',
      onUnpinAction: vi.fn(),
    };
    renderer.render(<PanelContainer {...props} />);
    const panel = renderer.getRenderOutput();

    expect(panel.props.style.width).toBe('680px');
    expect(nestedContainer(panel).props.className).toContain('msla-panel-container-nested-dual');
  });

  it('should render a pinned node on its own (no selected node) at single-pane width', () => {
    const props: PanelContainerProps = {
      ...minimal,
      node: undefined,
      alternateSelectedNode: makeNode('altNodeId'),
      alternateSelectedNodePersistence: 'pinned',
      onUnpinAction: vi.fn(),
    };
    renderer.render(<PanelContainer {...props} />);
    const panel = renderer.getRenderOutput();

    // A single pinned pane is not a dual view: normal single-pane width and no dual class.
    expect(panel.props.style.width).toBe('480px');
    expect(nestedContainer(panel).props.className).not.toContain('msla-panel-container-nested-dual');
  });

  it('should close the selected pane instead of unpinning when the pinned node matches the selected node', () => {
    const onClose = vi.fn();
    const onUnpinAction = vi.fn();
    const props: PanelContainerProps = {
      ...minimal,
      alternateSelectedNode: makeNode('nodeId'),
      alternateSelectedNodePersistence: 'pinned',
      onClose,
      onUnpinAction,
    };
    renderer.render(<PanelContainer {...props} />);
    const panel = renderer.getRenderOutput();
    const panelHeaders = findPanelHeaders(panel);

    expect(panelHeaders).toHaveLength(1);
    expect(panelHeaders[0].props.onClose).toBe(onClose);
    expect(panelHeaders[0].props.onUnpinAction).toBeUndefined();
  });

  it('should render nothing when there is no node, no pinned node, and no custom content', () => {
    const props: PanelContainerProps = {
      ...minimal,
      node: undefined,
      alternateSelectedNode: undefined,
    };
    renderer.render(<PanelContainer {...props} />);
    const panel = renderer.getRenderOutput();

    expect(panel).toBeNull();
  });
});
