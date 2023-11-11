import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from './plugins/toolbar/helper/Change';
import { useState } from 'react';

export const HTMLEditor = ({ initialValue, onChange, ...baseEditorProps }: BaseEditorProps): JSX.Element => {
  const [value, setValue] = useState<ValueSegment[]>(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
  };

  const handleBlur = () => {
    onChange?.({ value: value });
  };

  return (
    <BaseEditor
      {...baseEditorProps}
      className="msla-html-editor"
      initialValue={initialValue}
      BasePlugins={{ tokens: true, clearEditor: true, toolbar: true, ...baseEditorProps.BasePlugins }}
      tokenPickerButtonProps={{
        ...baseEditorProps.tokenPickerButtonProps,
        newlineVerticalOffset: 20,
      }}
      onBlur={handleBlur}
    >
      <Change setValue={onValueChange} />
    </BaseEditor>
  );
};
