import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import TokenPickerButton from '../editor/base/plugins/TokenPickerButton';
import type { EditorContentChangedEventArgs, EditorLanguage } from '../editor/monaco';
import { MonacoEditor as Editor } from '../editor/monaco';
import { buildInlineCodeTextFromToken } from './util';
import { useId } from '@fluentui/react-hooks';
import { useFunctionalState } from '@react-hookz/web';
import type { editor, IRange } from 'monaco-editor';
import { useRef, useState } from 'react';

interface CodeEditorProps extends BaseEditorProps {
  language: EditorLanguage;
}

export function CodeEditor({
  readonly = false,
  initialValue,
  language,
  onChange,
  onFocus,
  tokenPickerHandler,
}: CodeEditorProps): JSX.Element {
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const editorId = useId('msla-tokenpicker-callout-location');
  const labelId = useId('msla-tokenpicker-callout-label');
  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getEditorHeight(getInitialValue(initialValue)));
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(true);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (e.value !== undefined) {
      setCurrentValue(e.value);
      setEditorHeight(getEditorHeight(e.value));
    }
  };

  const handleBlur = (): void => {
    if (!getInTokenPicker()) {
      setInTokenPicker(false);
    }
    setShowTokenPickerButton(false);
    onChange?.({ value: [{ id: 'key', type: ValueSegmentType.LITERAL, value: getCurrentValue() }] });
  };

  const handleFocus = (): void => {
    setShowTokenPickerButton(true);
    setInTokenPicker(false);
    onFocus?.();
  };

  const handleShowTokenPicker = () => {
    if (showTokenPicker) {
      setInTokenPicker(false);
    }
    setShowTokenPicker(!showTokenPicker);
  };

  const onClickTokenPicker = (b: boolean) => {
    setInTokenPicker(b);
  };

  const tokenClicked = (valueSegment: ValueSegment) => {
    if (codeEditorRef.current && valueSegment.token) {
      const newText = buildInlineCodeTextFromToken(valueSegment.token, language);
      codeEditorRef.current.executeEdits(null, [{ range: codeEditorRef.current.getSelection() as IRange, text: newText }]);
      const currSelection = codeEditorRef.current.getSelection();
      if (currSelection) {
        setTimeout(() => {
          const { lineNumber, column } = currSelection.getEndPosition();
          codeEditorRef.current?.setSelection(currSelection.setStartPosition(lineNumber, column));
          codeEditorRef.current?.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="msla-code-editor-body" id={editorId}>
      <Editor
        ref={codeEditorRef}
        height={editorHeight}
        value={getCurrentValue()}
        fontSize={13}
        readOnly={readonly}
        lineNumbers="on"
        language={language}
        overviewRulerBorder={true}
        scrollBeyondLastLine={false}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showTokenPickerButton || getInTokenPicker() ? (
        <TokenPickerButton labelId={labelId} showTokenPicker={showTokenPicker} setShowTokenPicker={handleShowTokenPicker} />
      ) : null}
      {(showTokenPickerButton && showTokenPicker) || getInTokenPicker()
        ? tokenPickerHandler.getTokenPicker?.(editorId, labelId, onClickTokenPicker, tokenClicked)
        : null}
    </div>
  );
}

const getInitialValue = (initialValue: ValueSegment[]): string => {
  if (initialValue[0]?.value) {
    return formatValue(initialValue[0].value);
  }
  return '';
};

const formatValue = (input: string): string => {
  try {
    return JSON.stringify(JSON.parse(input), null, 4);
  } catch {
    return input;
  }
};

// Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
function getEditorHeight(input = ''): string {
  return Math.min(Math.max(input?.split('\n').length * 20, 120), 380) + 'px';
}
