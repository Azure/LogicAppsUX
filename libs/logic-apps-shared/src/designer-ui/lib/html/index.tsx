import type { ValueSegmentUI } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { convertSegmentsToString } from '../editor/base/utils/parsesegments';
import { HTMLChangePlugin } from './plugins/toolbar/helper/HTMLChangePlugin';
import { isHtmlStringValueSafeForLexical } from './plugins/toolbar/helper/util';
import { useState } from 'react';

export const HTMLEditor = ({ initialValue, onChange, ...baseEditorProps }: BaseEditorProps): JSX.Element => {
  const [isValuePlaintext, setIsValuePlaintext] = useState(() => {
    const blankNodeMap = new Map<string, ValueSegmentUI>();
    const initialValueString = convertSegmentsToString(initialValue, blankNodeMap);
    return !isHtmlStringValueSafeForLexical(initialValueString, blankNodeMap);
  });
  const [isSwitchFromPlaintextBlocked, setIsSwitchFromPlaintextBlocked] = useState(() => isValuePlaintext);
  const [value, setValue] = useState<ValueSegmentUI[]>(initialValue);

  const onValueChange = (newValue: ValueSegmentUI[]): void => {
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
        clearEditor: true,
        htmlEditor: isValuePlaintext ? 'raw-html' : 'rich-html',
        ...baseEditorProps.basePlugins,
      }}
      tokenPickerButtonProps={{
        ...baseEditorProps.tokenPickerButtonProps,
        newlineVerticalOffset: 20,
      }}
      isSwitchFromPlaintextBlocked={isSwitchFromPlaintextBlocked}
      onBlur={handleBlur}
      setIsValuePlaintext={setIsValuePlaintext}
    >
      <HTMLChangePlugin
        isValuePlaintext={isValuePlaintext}
        setIsSwitchFromPlaintextBlocked={setIsSwitchFromPlaintextBlocked}
        setIsValuePlaintext={setIsValuePlaintext}
        setValue={onValueChange}
      />
    </EditorWrapper>
  );
};
