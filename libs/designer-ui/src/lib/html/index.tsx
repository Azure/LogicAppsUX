import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from './plugins/toolbar/helper/Change';
import { useState } from 'react';

export const HTMLEditor = ({
  placeholder,
  readonly,
  initialValue,
  dataAutomationId,
  getTokenPicker,
  onChange,
}: BaseEditorProps): JSX.Element => {
  const [value, setValue] = useState<ValueSegment[]>(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
  };

  const handleBlur = () => {
    onChange?.({ value: value });
  };

  return (
    <BaseEditor
      className="msla-html-editor"
      readonly={readonly}
      placeholder={placeholder}
      BasePlugins={{ tokens: true, clearEditor: true, toolbar: true }}
      initialValue={initialValue}
      getTokenPicker={getTokenPicker}
      onBlur={handleBlur}
      dataAutomationId={dataAutomationId}
    >
      <Change setValue={onValueChange} />
    </BaseEditor>
  );
};
