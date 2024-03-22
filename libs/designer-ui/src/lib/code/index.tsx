import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import TokenPickerButtonLegacy from '../editor/base/plugins/TokenPickerButtonLegacy';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
import { useId } from '../useId';
import { buildInlineCodeTextFromToken, getEditorHeight, getInitialValue } from './util';
import type { EditorLanguage } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import type { editor, IRange } from 'monaco-editor';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

interface CodeEditorProps extends BaseEditorProps {
  language: EditorLanguage;
}

export function CodeEditor({
  readonly = false,
  initialValue,
  language,
  onChange,
  onFocus,
  getTokenPicker,
  label,
}: CodeEditorProps): JSX.Element {
  const intl = useIntl();
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const editorId = useId('msla-tokenpicker-callout-location');
  const callOutLabelId = useId('msla-tokenpicker-callout-label');
  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getEditorHeight(getInitialValue(initialValue)));
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (e.value !== undefined) {
      setCurrentValue(e.value);
      setEditorHeight(getEditorHeight(e.value));
    }
  };

  const handleBlur = (): void => {
    if (!getInTokenPicker()) {
      setShowTokenPickerButton(false);
    }
    onChange?.({ value: [createLiteralValueSegment(getCurrentValue())] });
  };

  const handleFocus = (): void => {
    setShowTokenPickerButton(true);
    setInTokenPicker(false);
    onFocus?.();
  };

  const handleShowTokenPicker = () => {
    setInTokenPicker(!getInTokenPicker());
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

  const getLabel = (label?: string): string => {
    return intl.formatMessage(
      {
        defaultMessage: `{label} To add dynamic data, press the Alt + '/' keys.`,
        id: 'IdOhPY',
        description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
      },
      { label }
    );
  };

  return (
    <div className="msla-code-editor-body" id={editorId}>
      <MonacoEditor
        label={getLabel(label)}
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
        openTokenPicker={handleShowTokenPicker}
      />
      {showTokenPickerButton || getInTokenPicker() ? (
        <TokenPickerButtonLegacy
          labelId={callOutLabelId}
          showTokenPicker={getInTokenPicker()}
          setShowTokenPicker={handleShowTokenPicker}
          codeEditor={codeEditorRef.current}
        />
      ) : null}
      {getInTokenPicker()
        ? getTokenPicker?.(
            editorId,
            callOutLabelId,
            undefined /* TokenPickerMode: undefined uses legacy tokenpicker */,
            undefined /* Editortype: undefined defaults to parameter type */,
            tokenClicked
          )
        : null}
    </div>
  );
}
