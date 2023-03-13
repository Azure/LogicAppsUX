import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import type { EventHandler } from '../eventhandler';
import type { editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useState, useEffect } from 'react';

export interface ExpressionEditorEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface ExpressionEditorProps {
  initialValue: string;
  editorRef?: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  isDragging: boolean;
  dragDistance?: number;
  currentHeight: number;
  setCurrentHeight: (height: number) => void;
  onBlur?: EventHandler<ExpressionEditorEvent>;
  setIsDragging: (isDragging: boolean) => void;
  setExpressionEditorError: (error: string) => void;
}

export function ExpressionEditor({
  initialValue,
  editorRef,
  onBlur,
  isDragging,
  dragDistance,
  currentHeight,
  setCurrentHeight,
  setIsDragging,
  setExpressionEditorError,
}: ExpressionEditorProps): JSX.Element {
  const [mouseDownLocation, setMouseDownLocation] = useState(0);
  useEffect(() => {
    if (isDragging && dragDistance) {
      setCurrentHeight(Math.min(Math.max(100, 100 + dragDistance - mouseDownLocation), 200));
    }
  }, [isDragging, dragDistance, mouseDownLocation, currentHeight, setCurrentHeight]);

  const handleBlur = (): void => {
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

  const handleChangeEvent = (e: editor.IModelContentChangedEvent): void => {
    setExpressionEditorError('');
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
    <div className="msla-expression-editor-container" style={{ height: currentHeight }}>
      <Editor
        ref={editorRef}
        language={EditorLanguage.templateExpressionLanguage}
        lineNumbers="off"
        value={initialValue}
        scrollbar={{ horizontal: 'hidden', vertical: 'hidden' }}
        minimapEnabled={false}
        overviewRulerLanes={0}
        overviewRulerBorder={false}
        contextMenu={false}
        onBlur={handleBlur}
        onContentChanged={handleChangeEvent}
        width={'100%'}
        wordWrap="bounded"
        wordWrapColumn={200}
        automaticLayout={true}
      />
      <div
        className="msla-expression-editor-expand"
        onMouseDown={(e) => {
          setMouseDownLocation(e.clientY);
          setIsDragging(true);
        }}
      >
        <div className="msla-expression-editor-expand-icon" /> <div className="msla-expression-editor-expand-icon-2" />
      </div>
    </div>
  );
}
