import type { BaseEditorProps, ChangeHandler } from '../base';
import { BaseEditor } from '../base';
import { Change } from '../base/plugins/Change';
import type { ValueSegment } from '../models/parameter';
import SingleLine from './stringPlugins/SingleLine';
import { useState } from 'react';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
  clearEditorOnTokenInsertion?: boolean;
  editorBlur?: ChangeHandler;
}

export const StringEditor = ({
  singleLine,
  initialValue,
  clearEditorOnTokenInsertion,
  editorBlur,
  onChange,
  ...baseEditorProps
}: StringEditorProps) => {
  const [value, setValue] = useState(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
    onChange?.({ value: newValue, viewModel: { hideErrorMessage: true } });
  };
  const handleBlur = () => {
    editorBlur?.({ value: value });
    onChange?.({ value: value, viewModel: { hideErrorMessage: false } });
  };

  return (
    <BaseEditor
      placeholder={baseEditorProps.placeholder}
      className={baseEditorProps.className}
      initialValue={initialValue}
      BasePlugins={{
        tokens: baseEditorProps.BasePlugins?.tokens ?? true,
        clearEditor: clearEditorOnTokenInsertion,
        singleValueSegment: clearEditorOnTokenInsertion,
      }}
      readonly={baseEditorProps.readonly}
      isTrigger={baseEditorProps.isTrigger}
      getTokenPicker={baseEditorProps.getTokenPicker}
      onBlur={handleBlur}
      onFocus={baseEditorProps.onFocus}
    >
      {singleLine ? <SingleLine /> : null}
      <Change setValue={onValueChange} />
    </BaseEditor>
  );
};
