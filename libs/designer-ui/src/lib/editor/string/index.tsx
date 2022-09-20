import type { BaseEditorProps } from '../base';
import { BaseEditor } from '../base';
import { Change } from '../base/plugins/Change';
import type { ValueSegment } from '../models/parameter';
import SingleLine from './stringPlugins/SingleLine';
import { useState } from 'react';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
}

export const StringEditor = ({ singleLine, initialValue, onChange, ...baseEditorProps }: StringEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const onValueChange = (newValue: ValueSegment[]): void => setValue(newValue);
  const handleBlur = () => {
    if (onChange) {
      onChange({ value: value as ValueSegment[] });
    }
  };

  return (
    <BaseEditor
      placeholder={baseEditorProps.placeholder}
      className={baseEditorProps.className}
      initialValue={value}
      BasePlugins={{ tokens: true }}
      onBlur={handleBlur}
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
