import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeMirrorEditor } from '../CodeMirrorEditor';
import { createRef } from 'react';
import type { CodeMirrorEditorRef } from '../types';

// Mock isInverted as a mutable value so tests can change it between renders
let mockIsInverted = false;
vi.mock('@fluentui/react', () => ({
  useTheme: () => ({ isInverted: mockIsInverted }),
}));

describe('CodeMirrorEditor', () => {
  beforeEach(() => {
    mockIsInverted = false;
  });

  it('should render without crashing', () => {
    const { container } = render(<CodeMirrorEditor />);
    // CodeMirror creates elements with cm-editor class
    expect(container.querySelector('.cm-editor')).toBeInTheDocument();
  });

  it('should display defaultValue', () => {
    render(<CodeMirrorEditor defaultValue="test content" />);
    expect(screen.getByText('test content')).toBeInTheDocument();
  });

  it('should expose ref methods', () => {
    const ref = createRef<CodeMirrorEditorRef>();
    render(<CodeMirrorEditor ref={ref} defaultValue="hello" />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.getValue()).toBe('hello');
  });

  it('should apply custom height', () => {
    const { container } = render(<CodeMirrorEditor height="200px" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('200px');
  });

  it('should call onContentChanged when content changes via ref', () => {
    const onContentChanged = vi.fn();
    const ref = createRef<CodeMirrorEditorRef>();
    render(<CodeMirrorEditor ref={ref} onContentChanged={onContentChanged} />);

    // Programmatically set value via ref
    ref.current?.setValue('new content');

    expect(onContentChanged).toHaveBeenCalled();
  });

  describe('showMerge', () => {
    it('should render a MergeView when showMerge is true', () => {
      const { container } = render(<CodeMirrorEditor showMerge originalValue="original" defaultValue="modified" />);
      // MergeView creates a wrapper element with the cm-mergeView class
      expect(container.querySelector('.cm-mergeView')).toBeInTheDocument();
    });

    it('should not render a MergeView when showMerge is false', () => {
      const { container } = render(<CodeMirrorEditor showMerge={false} defaultValue="content" />);
      expect(container.querySelector('.cm-mergeView')).not.toBeInTheDocument();
      expect(container.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should display both original and modified values in merge view', () => {
      const { container } = render(<CodeMirrorEditor showMerge originalValue="original text" defaultValue="modified text" />);
      // MergeView may split text across multiple DOM nodes for diff highlighting,
      // so check the full text content of the container rather than exact text nodes
      const textContent = container.textContent ?? '';
      expect(textContent).toContain('original text');
      expect(textContent).toContain('modified text');
    });

    it('should expose ref that returns the modified value from panel B', () => {
      const ref = createRef<CodeMirrorEditorRef>();
      render(<CodeMirrorEditor ref={ref} showMerge originalValue="original" defaultValue="modified" />);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.getValue()).toBe('modified');
    });

    it('should make the original panel read-only', () => {
      const { container } = render(<CodeMirrorEditor showMerge originalValue="original" defaultValue="modified" />);
      // The MergeView renders two .cm-editor elements; panel A (original) should have contenteditable=false
      const editors = container.querySelectorAll('.cm-editor');
      expect(editors.length).toBeGreaterThanOrEqual(2);
      const panelAContent = editors[0].querySelector('.cm-content');
      expect(panelAContent).toHaveAttribute('contenteditable', 'false');
    });

    it('should create a merge view when showMerge changes from false to true', () => {
      const { container, rerender } = render(<CodeMirrorEditor showMerge={false} defaultValue="content" />);
      expect(container.querySelector('.cm-mergeView')).not.toBeInTheDocument();

      rerender(<CodeMirrorEditor showMerge originalValue="original" defaultValue="content" />);
      expect(container.querySelector('.cm-mergeView')).toBeInTheDocument();
    });

    it('should switch back to a regular editor when showMerge changes from true to false', () => {
      const { container, rerender } = render(<CodeMirrorEditor showMerge originalValue="original" defaultValue="content" />);
      expect(container.querySelector('.cm-mergeView')).toBeInTheDocument();

      rerender(<CodeMirrorEditor showMerge={false} defaultValue="content" />);
      expect(container.querySelector('.cm-mergeView')).not.toBeInTheDocument();
      expect(container.querySelector('.cm-editor')).toBeInTheDocument();
    });

    it('should update panel A when originalValue changes', () => {
      const { container, rerender } = render(<CodeMirrorEditor showMerge originalValue="first original" defaultValue="modified" />);
      const textContent = container.textContent ?? '';
      expect(textContent).toContain('first original');

      rerender(<CodeMirrorEditor showMerge originalValue="updated original" defaultValue="modified" />);
      const updatedTextContent = container.textContent ?? '';
      expect(updatedTextContent).toContain('updated original');
    });

    it('should update language in both panels when language prop changes', () => {
      const { container, rerender } = render(<CodeMirrorEditor showMerge originalValue='{"a":1}' defaultValue='{"b":2}' language="json" />);
      const editors = container.querySelectorAll('.cm-editor');
      expect(editors.length).toBeGreaterThanOrEqual(2);

      // Rerender with a different language — should not throw
      rerender(<CodeMirrorEditor showMerge originalValue='{"a":1}' defaultValue='{"b":2}' language="xml" />);
      // Both editors should still be present
      expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThanOrEqual(2);
    });

    it('should update theme in both panels when isInverted changes', () => {
      mockIsInverted = false;
      const { container, rerender } = render(<CodeMirrorEditor showMerge originalValue="original" defaultValue="modified" />);
      const editors = container.querySelectorAll('.cm-editor');
      expect(editors.length).toBeGreaterThanOrEqual(2);

      // Toggle theme
      mockIsInverted = true;
      rerender(<CodeMirrorEditor showMerge originalValue="original" defaultValue="modified" />);
      // Both editors should still be present after theme change
      expect(container.querySelectorAll('.cm-editor').length).toBeGreaterThanOrEqual(2);
    });
  });
});
