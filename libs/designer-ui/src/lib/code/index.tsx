import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import TokenPickerButton from '../editor/base/plugins/TokenPickerButton';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import { useId } from '@fluentui/react-hooks';
import { useFunctionalState } from '@react-hookz/web';
import { useState } from 'react';

export function CodeEditor({ readonly = false, initialValue, onChange, onFocus, GetTokenPicker }: BaseEditorProps): JSX.Element {
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

  const tokenClicked = (token: ValueSegment) => {
    console.log(token);
  };

  return (
    <div className="msla-code-editor-body" id={editorId}>
      <Editor
        height={editorHeight}
        value={getCurrentValue()}
        fontSize={13}
        readOnly={readonly}
        lineNumbers="off"
        language={EditorLanguage.javascript}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showTokenPickerButton || getInTokenPicker() ? (
        <TokenPickerButton labelId={labelId} showTokenPicker={showTokenPicker} setShowTokenPicker={handleShowTokenPicker} />
      ) : null}
      {(showTokenPickerButton && showTokenPicker) || getInTokenPicker()
        ? GetTokenPicker?.(editorId, labelId, onClickTokenPicker, tokenClicked)
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
