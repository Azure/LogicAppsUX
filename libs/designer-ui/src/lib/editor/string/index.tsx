import type { BaseEditorProps, ChangeHandler } from '../base';
import { BaseEditor } from '../base';
import { Change } from '../base/plugins/Change';
import type { ValueSegment } from '../models/parameter';
import SingleLine from './stringPlugins/SingleLine';
import { useState } from 'react';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
  editorBlur?: ChangeHandler;
}

export const StringEditor = ({ singleLine, initialValue, editorBlur, onChange, ...baseEditorProps }: StringEditorProps) => {
  const [value, setValue] = useState(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
    onChange?.({ value: newValue });
  };
  const handleBlur = () => {
    editorBlur?.({ value: value });
  };

  return (
    <BaseEditor
      placeholder={baseEditorProps.placeholder}
      className={baseEditorProps.className}
      initialValue={value}
      BasePlugins={{ tokens: baseEditorProps.BasePlugins?.tokens ?? true }}
      onBlur={handleBlur}
      onFocus={baseEditorProps.onFocus}
      readonly={baseEditorProps.readonly}
      isTrigger={baseEditorProps.isTrigger}
      GetTokenPicker={baseEditorProps.GetTokenPicker}
      tokenPickerButtonProps={baseEditorProps.tokenPickerButtonProps}
    >
      {singleLine ? <SingleLine /> : null}
      <Change setValue={onValueChange} />
    </BaseEditor>
  );
};
