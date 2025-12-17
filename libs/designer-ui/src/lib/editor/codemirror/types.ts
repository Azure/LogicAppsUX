import type { EditorView } from '@codemirror/view';
import type { SelectionRange } from '@codemirror/state';

/**
 * Props interface matching MonacoEditor for drop-in replacement
 */
export interface CodeMirrorEditorProps {
  className?: string;
  defaultValue?: string;
  value?: string;
  language?: string;
  height?: string;
  width?: string;
  label?: string;
  readOnly?: boolean;
  lineNumbers?: 'on' | 'off';
  wordWrap?: 'on' | 'off' | 'bounded';
  wordWrapColumn?: number;
  folding?: boolean;
  fontSize?: number;
  tabSize?: number;
  insertSpaces?: boolean;
  minimapEnabled?: boolean;
  contextMenu?: boolean;
  scrollBeyondLastLine?: boolean;
  lineNumbersMinChars?: number;
  automaticLayout?: boolean;
  overviewRulerLanes?: number;
  overviewRulerBorder?: boolean;
  scrollbar?: {
    horizontal?: 'auto' | 'hidden' | 'visible';
    vertical?: 'auto' | 'hidden' | 'visible';
  };
  monacoContainerStyle?: React.CSSProperties;
  indentWithTab?: boolean;

  // Event callbacks
  onBlur?(): void;
  onBlurText?(): void;
  onFocus?(): void;
  onFocusText?(): void;
  onContentChanged?(e: EditorContentChangedEvent): void;
  onCursorPositionChanged?(e: CursorPositionChangedEvent): void;
  onScrollChanged?(e: ScrollChangedEvent): void;
  onEditorLoaded?(): void;
  onEditorRef?(editor: CodeMirrorEditorRef | undefined): void;
  onMouseDown?(e: MouseEvent): void;
  openTokenPicker?(): void;
}

export interface EditorContentChangedEvent {
  value?: string;
}

export interface CursorPositionChangedEvent {
  position: {
    lineNumber: number;
    column: number;
  };
}

export interface ScrollChangedEvent {
  scrollTop: number;
  scrollLeft: number;
}

/**
 * Ref interface matching Monaco's IStandaloneCodeEditor methods
 */
export interface CodeMirrorEditorRef {
  getValue(): string;
  getModel(): { getValue(): string } | null;
  setValue(text: string): void;
  getSelection(): SelectionRange | null;
  setSelection(range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }): void;
  getPosition(): { lineNumber: number; column: number } | null;
  executeEdits(source: string | null, edits: Array<{ range: any; text: string }>): void;
  focus(): void;
  layout(): void;
  getView(): EditorView | null;
}
