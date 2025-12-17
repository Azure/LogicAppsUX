/**
 * Re-export CodeMirror as Monaco for backwards compatibility.
 * This file maintains the same exports that consumers expect.
 */

// Re-export the editor component with Monaco name
export { CodeMirrorEditor as MonacoEditor } from '../codemirror';
export { CodeMirrorEditor } from '../codemirror';

// Re-export types with Monaco-compatible names
export type {
  CodeMirrorEditorProps as MonacoProps,
  CodeMirrorEditorRef,
  EditorContentChangedEvent as EditorContentChangedEventArgs,
  CursorPositionChangedEvent,
  ScrollChangedEvent,
} from '../codemirror';

// Alias for ref type used by some consumers expecting 'editor' namespace
export type { CodeMirrorEditorRef as editor } from '../codemirror';

// Default export for backward compatibility
export { CodeMirrorEditor as default } from '../codemirror';
