import { describe, it, expect, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createEventExtensions } from '../events';

describe('createEventExtensions', () => {
  it('should return an array of extensions', () => {
    const extensions = createEventExtensions({});
    expect(Array.isArray(extensions)).toBe(true);
  });

  it('should include focus handler when onFocus provided', () => {
    const onFocus = vi.fn();
    const extensions = createEventExtensions({ onFocus });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should include blur handler when onBlur provided', () => {
    const onBlur = vi.fn();
    const extensions = createEventExtensions({ onBlur });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should include content change handler when onContentChanged provided', () => {
    const onContentChanged = vi.fn();
    const extensions = createEventExtensions({ onContentChanged });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should call onFocus when editor receives focus', () => {
    const onFocus = vi.fn();
    const extensions = createEventExtensions({ onFocus });

    const state = EditorState.create({
      doc: 'test',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    // Simulate focus event
    view.contentDOM.dispatchEvent(new FocusEvent('focus'));

    expect(onFocus).toHaveBeenCalled();

    view.destroy();
  });

  it('should call onBlur when editor loses focus', () => {
    const onBlur = vi.fn();
    const extensions = createEventExtensions({ onBlur });

    const state = EditorState.create({
      doc: 'test',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    // Simulate blur event
    view.contentDOM.dispatchEvent(new FocusEvent('blur'));

    expect(onBlur).toHaveBeenCalled();

    view.destroy();
  });

  it('should call onContentChanged when document changes', () => {
    const onContentChanged = vi.fn();
    const extensions = createEventExtensions({ onContentChanged });

    const state = EditorState.create({
      doc: 'initial',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    // Make a change
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: 'modified' },
    });

    expect(onContentChanged).toHaveBeenCalledWith({
      value: 'modified',
    });

    view.destroy();
  });

  it('should call onCursorPositionChanged when selection changes', () => {
    const onCursorPositionChanged = vi.fn();
    const extensions = createEventExtensions({ onCursorPositionChanged });

    const state = EditorState.create({
      doc: 'line1\nline2\nline3',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    // Move cursor to position 8 (position 2 in line 2: "line1\n" = 6, plus 2 more = position 8)
    view.dispatch({
      selection: { anchor: 8 },
    });

    expect(onCursorPositionChanged).toHaveBeenCalledWith({
      position: {
        lineNumber: 2,
        column: 3, // Position 8 is "li|ne2" (after "li")
      },
    });

    view.destroy();
  });

  it('should call onScrollChanged when editor scrolls', () => {
    const onScrollChanged = vi.fn();
    const extensions = createEventExtensions({ onScrollChanged });

    const state = EditorState.create({
      doc: 'test\n'.repeat(100), // Create content that needs scrolling
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    // Simulate scroll event
    view.scrollDOM.scrollTop = 50;
    view.scrollDOM.dispatchEvent(new Event('scroll'));

    expect(onScrollChanged).toHaveBeenCalledWith({
      scrollTop: 50,
      scrollLeft: 0,
    });

    view.destroy();
  });

  it('should include mouse down handler when onMouseDown provided', () => {
    const onMouseDown = vi.fn();
    const extensions = createEventExtensions({ onMouseDown });
    // Verify extension array includes handler for onMouseDown
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should call both onFocus and onFocusText when provided', () => {
    const onFocus = vi.fn();
    const onFocusText = vi.fn();
    const extensions = createEventExtensions({ onFocus, onFocusText });

    const state = EditorState.create({
      doc: 'test',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    view.contentDOM.dispatchEvent(new FocusEvent('focus'));

    expect(onFocus).toHaveBeenCalled();
    expect(onFocusText).toHaveBeenCalled();

    view.destroy();
  });

  it('should call both onBlur and onBlurText when provided', () => {
    const onBlur = vi.fn();
    const onBlurText = vi.fn();
    const extensions = createEventExtensions({ onBlur, onBlurText });

    const state = EditorState.create({
      doc: 'test',
      extensions,
    });

    const view = new EditorView({
      state,
      parent: document.body,
    });

    view.contentDOM.dispatchEvent(new FocusEvent('blur'));

    expect(onBlur).toHaveBeenCalled();
    expect(onBlurText).toHaveBeenCalled();

    view.destroy();
  });

  it('should return empty array when no event handlers provided', () => {
    const extensions = createEventExtensions({});
    expect(extensions).toEqual([]);
  });
});
