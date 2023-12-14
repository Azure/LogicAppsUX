import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { HTMLChangePlugin } from './plugins/toolbar/helper/HTMLChangePlugin';
import { useState } from 'react';

export const HTMLEditor = ({ initialValue, onChange, ...baseEditorProps }: BaseEditorProps): JSX.Element => {
  const [isValuePlaintext, setIsValuePlaintext] = useState(false);
  const [value, setValue] = useState<ValueSegment[]>(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
  };

  const handleBlur = () => {
    onChange?.({ value: value });
  };

  return (
    <EditorWrapper
      {...baseEditorProps}
      className="msla-html-editor"
      initialValue={initialValue}
      basePlugins={{
        tokens: true,
        clearEditor: true,
        htmlEditor: isValuePlaintext ? 'raw-html' : 'rich-html',
        ...baseEditorProps.basePlugins,
      }}
      tokenPickerButtonProps={{
        ...baseEditorProps.tokenPickerButtonProps,
        newlineVerticalOffset: 20,
      }}
      onBlur={handleBlur}
      setIsValuePlaintext={setIsValuePlaintext}
    >
      <HTMLChangePlugin
        isValuePlaintext={isValuePlaintext}
        loadParameterValueFromString={baseEditorProps.loadParameterValueFromString}
        setValue={onValueChange}
      />
    </EditorWrapper>
  );
};
