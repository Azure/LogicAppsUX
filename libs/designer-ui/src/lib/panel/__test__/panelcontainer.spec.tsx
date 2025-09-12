import { PanelLocation, PanelScope } from '../panelUtil';
import type { PanelContainerProps } from '../panelcontainer';
import { PanelContainer } from '../panelcontainer';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

// Mock react-intl
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
      formatDate: vi.fn((date) => `Formatted: ${date}`),
    }),
  };
});

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
    expect(panel.props.style).toEqual({ position: 'relative', height: '100%', maxWidth: '100%', width: '614.4px' });
  });
});
