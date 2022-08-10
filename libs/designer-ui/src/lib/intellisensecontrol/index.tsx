import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import type { EventHandler } from '../eventhandler';
import type { editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useState } from 'react';

export interface IntellisenseControlEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface IntellisenseControlProps {
  initialValue: string;
  editorRef?: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  onBlur?: EventHandler<IntellisenseControlEvent>;
}

export function IntellisenseControl({ initialValue, editorRef, onBlur }: IntellisenseControlProps): JSX.Element {
  const [focused, setFocused] = useState(false);

  const handleBlur = (): void => {
    setFocused(false);
    if (onBlur && editorRef?.current) {
      const currentSelection = editorRef.current.getSelection();
      const currentCursorPosition = editorRef.current.getPosition()?.column ?? 1 - 1;
      if (currentSelection) {
        const { startLineNumber, startColumn, endLineNumber, endColumn } = currentSelection;
        const isValidSelection = startLineNumber === endLineNumber;
        const selectionStart = isValidSelection ? startColumn - 1 : currentCursorPosition;
        const selectionEnd = isValidSelection ? endColumn - 1 : currentCursorPosition;
        onBlur({ value: editorRef.current.getValue(), selectionStart, selectionEnd });
      }
    }
  };

  const handleFocus = (): void => {
    setFocused(true);
  };

  return (
    <div className={focused ? 'msla-intellisense-editor-container msla-focused' : 'msla-intellisense-editor-container'}>
      <Editor
        ref={editorRef}
        className={'msla-intellisense-editor'}
        language={EditorLanguage.templateExpressionLanguage}
        folding={false}
        lineNumbers="off"
        value={initialValue}
        scrollbar={{ horizontal: 'hidden', vertical: 'hidden' }}
        minimapEnabled={false}
        overviewRulerLanes={0}
        overviewRulerBorder={false}
        contextMenu={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
        width={'340px'}
      />
    </div>
  );
}
