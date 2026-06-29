import type { EditorContentChangedEventArgs, CodeMirrorEditorRef, CursorPositionChangedEvent } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
import type { EventHandler } from '../eventhandler';
import { getSignatureAtPosition, type SignatureInfo } from '../editor/codemirror/languages/workflow/signature';
import { ExpressionEditorSignature } from './expressioneditorsignature';
import { EditorLanguage, clamp } from '@microsoft/logic-apps-shared';
import type { MutableRefObject } from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';

export interface ExpressionEditorEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface ExpressionEditorProps {
  initialValue: string;
  editorRef?: MutableRefObject<CodeMirrorEditorRef | null>;
  isDragging: boolean;
  dragDistance?: number;
  currentHeight: number;
  setCurrentHeight: (height: number) => void;
  onBlur?: EventHandler<ExpressionEditorEvent>;
  setIsDragging: (isDragging: boolean) => void;
  setExpressionEditorError: (error: string) => void;
  onFocus?: () => void;
  onContentChanged?(e: EditorContentChangedEventArgs): void;
  isReadOnly?: boolean;
}

export function ExpressionEditor({
  initialValue,
  editorRef,
  isDragging,
  dragDistance,
  currentHeight,
  setCurrentHeight,
  onBlur,
  onFocus,
  setIsDragging,
  setExpressionEditorError,
  onContentChanged,
  isReadOnly = false,
}: ExpressionEditorProps): JSX.Element {
  const [mouseDownLocation, setMouseDownLocation] = useState(0);
  const [heightOnMouseDown, setHeightOnMouseDown] = useState(0);
  const [signature, setSignature] = useState<SignatureInfo | null>(null);
  const latestValueRef = useRef(initialValue);
  const latestOffsetRef = useRef(0);
  useEffect(() => {
    if (isDragging && dragDistance) {
      setCurrentHeight(clamp(heightOnMouseDown + dragDistance - mouseDownLocation, 50, 200));
    }
  }, [isDragging, dragDistance, mouseDownLocation, currentHeight, setCurrentHeight, heightOnMouseDown]);

  useEffect(() => {
    latestValueRef.current = initialValue;
  }, [initialValue]);

  // Compute the absolute character offset from a line/column position.
  const getOffset = (text: string, lineNumber: number, column: number): number => {
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for the newline character
    }
    return offset + (column - 1);
  };

  // Recompute the signature help shown below the editor (issue #9292: this is
  // rendered in-flow instead of as a floating tooltip so it never covers text).
  const recomputeSignature = useCallback(() => {
    const text = latestValueRef.current;
    const offset = latestOffsetRef.current;
    const textBefore = text.slice(Math.max(0, offset - 200), offset);
    if (!textBefore.includes('(')) {
      setSignature(null);
      return;
    }
    setSignature(getSignatureAtPosition(text, offset));
  }, []);

  const handleBlur = (): void => {
    setSignature(null);
    if (onBlur && editorRef?.current) {
      const currentSelection = editorRef.current.getSelection();
      const currentCursorPosition = editorRef.current.getPosition()?.column ?? 1;
      if (currentSelection) {
        // CodeMirror selection uses character offsets (from, to)
        const selectionStart = currentSelection.from;
        const selectionEnd = currentSelection.to;
        onBlur({ value: editorRef.current.getValue(), selectionStart, selectionEnd });
      } else {
        onBlur({ value: editorRef.current.getValue(), selectionStart: currentCursorPosition, selectionEnd: currentCursorPosition });
      }
    }
  };

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    latestValueRef.current = e.value ?? '';
    recomputeSignature();
    if (onContentChanged) {
      onContentChanged(e);
    } else {
      setExpressionEditorError('');
    }
  };

  const handleCursorPositionChanged = (e: CursorPositionChangedEvent): void => {
    latestOffsetRef.current = getOffset(latestValueRef.current, e.position.lineNumber, e.position.column);
    recomputeSignature();
  };

  return (
    <div className="msla-expression-editor">
      <div className="msla-expression-editor-container" style={{ height: currentHeight }}>
        <MonacoEditor
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
          onFocus={onFocus}
          onContentChanged={handleContentChanged}
          onCursorPositionChanged={handleCursorPositionChanged}
          width={'100%'}
          wordWrap="bounded"
          wordWrapColumn={200}
          automaticLayout={true}
          data-automation-id="msla-expression-editor"
          height={`${currentHeight}px`}
          readOnly={isReadOnly}
          tabSize={2}
        />
        <div
          className="msla-expression-editor-expand"
          onMouseDown={(e) => {
            setMouseDownLocation(e.clientY);
            setIsDragging(true);
            setHeightOnMouseDown(currentHeight);
          }}
        >
          <div className="msla-expression-editor-expand-icon" /> <div className="msla-expression-editor-expand-icon-2" />
        </div>
      </div>
      {signature ? <ExpressionEditorSignature signature={signature} /> : null}
    </div>
  );
}
