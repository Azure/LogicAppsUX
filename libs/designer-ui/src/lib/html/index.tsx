import { notEqual } from '../editor/base/utils/helper';
import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { convertSegmentsToString } from '../editor/base/utils/parsesegments';
import { HTMLChangePlugin } from './plugins/toolbar/helper/HTMLChangePlugin';
import { isHtmlStringValueSafeForLexical } from './plugins/toolbar/helper/util';
import { useState } from 'react';
import { mergeClasses } from '@fluentui/react-components';

const isValueSafeForLexical = (value: ValueSegment[]) => {
  const blankNodeMap = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(value, blankNodeMap);
  return isHtmlStringValueSafeForLexical(initialValueString, blankNodeMap);
};

export const HTMLEditor = ({ initialValue, onChange, ...baseEditorProps }: BaseEditorProps): JSX.Element => {
  const [isValuePlaintext, setIsValuePlaintext] = useState(() => !isValueSafeForLexical(initialValue));
  const [isSwitchFromPlaintextBlocked, setIsSwitchFromPlaintextBlocked] = useState(() => isValuePlaintext);
  const [value, setValue] = useState<ValueSegment[]>(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
  };

  const handleBlur = () => {
    if (notEqual(value, initialValue)) {
      onChange?.({ value: value });
    }
  };

  const handleSetIsValuePlaintext = (newIsPlaintext: boolean) => {
    setIsValuePlaintext(newIsPlaintext);
    setIsSwitchFromPlaintextBlocked(!isValueSafeForLexical(value));
  };

  return (
    <EditorWrapper
      {...baseEditorProps}
      className={mergeClasses('msla-html-editor', baseEditorProps.className)}
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
      setIsValuePlaintext={handleSetIsValuePlaintext}
    >
      <HTMLChangePlugin
        isValuePlaintext={isValuePlaintext}
        setIsSwitchFromPlaintextBlocked={setIsSwitchFromPlaintextBlocked}
        setValue={onValueChange}
      />
    </EditorWrapper>
  );
};
