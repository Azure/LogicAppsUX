import { render } from '@testing-library/react';
import type { editor } from 'monaco-editor';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonacoEditor } from '../index';

// Mock Monaco editor
const mockEditor = {
  focus: vi.fn(),
  dispose: vi.fn(),
  getModel: vi.fn(),
  setModel: vi.fn(),
  setValue: vi.fn(),
  getValue: vi.fn(() => ''),
  onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
  onDidBlurEditorText: vi.fn(() => ({ dispose: vi.fn() })),
  onDidFocusEditorText: vi.fn(() => ({ dispose: vi.fn() })),
  addCommand: vi.fn(),
} as unknown as editor.IStandaloneCodeEditor;

const mockCreate = vi.fn(() => mockEditor);

// Mock monaco-editor module
vi.mock('monaco-editor', () => ({
  editor: {
    create: mockCreate,
    createModel: vi.fn(),
    defineTheme: vi.fn(),
    setTheme: vi.fn(),
  },
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
  },
  KeyCode: {},
  KeyMod: {},
}));

describe('MonacoEditor Focus Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call editor.focus() when not readonly', () => {
    render(<MonacoEditor height="100px" width="100px" value="" readOnly={false} onChange={() => {}} />);

    // Verify that the editor was created and focused
    expect(mockCreate).toHaveBeenCalled();
    expect(mockEditor.focus).toHaveBeenCalled();
  });

  it('should not call editor.focus() when readonly', () => {
    render(<MonacoEditor height="100px" width="100px" value="" readOnly={true} onChange={() => {}} />);

    // Verify that the editor was created but NOT focused
    expect(mockCreate).toHaveBeenCalled();
    expect(mockEditor.focus).not.toHaveBeenCalled();
  });

  it('should call editor.focus() for schema editor use case (not readonly)', () => {
    // This test simulates the specific use case from the issue:
    // HTTP request trigger's request body JSON schema area
    render(<MonacoEditor height="200px" width="100%" value="" readOnly={false} language="json" onChange={() => {}} />);

    // Verify that the editor receives focus, allowing cursor to appear
    expect(mockEditor.focus).toHaveBeenCalled();
  });
});
