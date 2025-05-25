import React from 'react';
import { PanelContent, type PanelContentProps } from '../panelcontent';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';

// Mock the intl hooks used in the component
vi.mock('react-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }) => defaultMessage,
  }),
}));

describe('ui/panel/panelContent', () => {
  let minimal: PanelContentProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      nodeId: '',
      tabs: [],
      trackEvent: vi.fn(),
      selectTab: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panelContent = renderer.render(<PanelContent {...minimal} />);
    expect(panelContent).toBeTruthy();
  });

  it('should render menu items when passed tabs.', () => {
    // TODO: 13865562 When Tabs get setup
  });
});
