import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeMirrorEditor } from '../CodeMirrorEditor';
import { createRef } from 'react';
import type { CodeMirrorEditorRef } from '../types';

// Mock the Fluent UI useTheme hook
vi.mock('@fluentui/react', () => ({
  useTheme: () => ({ isInverted: false }),
}));

describe('CodeMirrorEditor', () => {
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
});
