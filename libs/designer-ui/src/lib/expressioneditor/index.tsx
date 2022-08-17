import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import type { EventHandler } from '../eventhandler';
import type { editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useState } from 'react';

export interface ExpressionEditorEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface ExpressionEditorProps {
  initialValue: string;
  editorRef?: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  onBlur?: EventHandler<ExpressionEditorEvent>;
}

export function ExpressionEditor({ initialValue, editorRef, onBlur }: ExpressionEditorProps): JSX.Element {
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

  const handleChangeEvent = (e: editor.IModelContentChangedEvent): void => {
    const changedText = e.changes.length ? e.changes[0].text : '';
    if (changedText === '\r\n' && editorRef?.current) {
      const oldPosition = editorRef.current.getPosition();
      const currentValue = editorRef.current.getValue();
      const newValue = currentValue.replace(/\r\n/g, '');
      editorRef.current.setValue(newValue);

      if (oldPosition) {
        const cursorPosition = oldPosition.column - 1;
        setTimeout(() => setSelection(cursorPosition, cursorPosition));
      }
    }
  };

  const setSelection = (selectionStart: number, selectionEnd: number) => {
    if (editorRef?.current) {
      editorRef?.current.focus();

      if (selectionStart !== undefined && selectionEnd !== undefined) {
        editorRef?.current.setSelection({
          startLineNumber: 1,
          startColumn: selectionStart + 1,
          endLineNumber: 1,
          endColumn: selectionEnd + 1,
        });
      }
    }
  };

  return (
    <div className={focused ? 'msla-expression-editor-container msla-focused' : 'msla-expression-editor-container'}>
      <Editor
        ref={editorRef}
        className={'msla-expression-editor-main'}
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
        onContentChanged={handleChangeEvent}
        width={'340px'}
      />
    </div>
  );
}
