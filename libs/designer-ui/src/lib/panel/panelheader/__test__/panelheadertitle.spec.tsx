import type { PanelHeaderTitleProps } from '../panelheadertitle';
import { PanelHeaderTitle } from '../panelheadertitle';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';

// Mock useIntl hook
vi.mock('react-intl', async () => {
  const actual = await vi.importActual('react-intl');
  return {
    ...(actual as object),
    useIntl: () => ({
      formatMessage: ({ defaultMessage }) => defaultMessage,
    }),
  };
});

describe('ui/panel/panelheadertitle', () => {
  let minimal: PanelHeaderTitleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { onChange: vi.fn(), handleTitleUpdate: vi.fn() };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panelheadertitle = renderer.render(<PanelHeaderTitle {...minimal} />);
    expect(panelheadertitle).toMatchSnapshot();
  });

  it('should render panelheadertitle with TextField when in edit mode.', () => {
    const props = { ...minimal, titleValue: 'Panel Title', readOnlyMode: false, renameTitleDisabled: false, titleId: 'testId' };
    renderer.render(<PanelHeaderTitle {...props} />);
    const title = renderer.getRenderOutput();

    expect(title.props.className).toBe('msla-card-title');
    expect(title.props.id).toBe(props.titleId);
    expect(title.props.readOnly).toBe(false);
    expect(title.props.ariaLabel).toBe('Card title');
    expect(title.props.value).toBe(props.titleValue);
  });

  it('should render panelheadertitle with h2 when in read-only mode.', () => {
    const props = { ...minimal, titleValue: 'Panel Title', readOnlyMode: true, titleId: 'testId' };
    renderer.render(<PanelHeaderTitle {...props} />);
    const title = renderer.getRenderOutput();

    expect(title.type).toBe('h2');
    expect(title.props.id).toBe(props.titleId);
    expect(title.props.className).toBe('msla-panel-header-title');
    expect(title.props.children).toBe(props.titleValue);
  });
});
