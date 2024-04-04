import type { PanelHeaderCommentProps } from '../panelheadercomment';
import { PanelHeaderComment } from '../panelheadercomment';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('ui/panel/panelheadercomment', () => {
  let minimal: PanelHeaderCommentProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { isCollapsed: false };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panelheadercomment = renderer.render(<PanelHeaderComment {...minimal} />);
    expect(panelheadercomment).toMatchSnapshot();
  });

  it('should render panelheadercomment when passed a comment.', () => {
    const props = { ...minimal, noNodeSelected: false, readOnlyMode: false, comment: 'Panel comment' };
    renderer.render(<PanelHeaderComment {...props} />);
    const commentContainer = renderer.getRenderOutput();

    expect(commentContainer.props.className).toBe('msla-panel-comment-container');

    const [icon, comment]: any[] = React.Children.toArray(commentContainer.props.children);
    expect(icon.props.className).toBe('msla-comment-icon');

    expect(comment.props.className).toBe('msla-card-comment');
    expect(comment.props.ariaLabel).toBe('Comment');
    expect(comment.props.multiline).toBeTruthy();
    expect(comment.props.autoAdjustHeight).toBeTruthy();
    expect(comment.props.resizable).not.toBeTruthy();
    expect(comment.props.readOnly).toBe(props.readOnlyMode);
    expect(comment.props.ariaLabel).toBe('Comment');
    expect(comment.props.maxLength).toBe(256);
    expect(comment.props.value).toBe(props.comment);
  });
});
