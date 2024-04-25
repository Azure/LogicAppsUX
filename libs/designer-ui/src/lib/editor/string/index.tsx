import type { BaseEditorProps, ChangeHandler } from '../base';
import { EditorWrapper } from '../base/EditorWrapper';
import { EditorChangePlugin } from '../base/plugins/EditorChange';
import type { ValueSegment } from '../models/parameter';
import { useState } from 'react';

export interface StringEditorProps extends BaseEditorProps {
  clearEditorOnTokenInsertion?: boolean;
  editorBlur?: ChangeHandler;
}

export const StringEditor = ({
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
    <EditorWrapper
      {...baseEditorProps}
      initialValue={initialValue}
      basePlugins={{
        clearEditor: clearEditorOnTokenInsertion,
        singleValueSegment: clearEditorOnTokenInsertion,
        ...baseEditorProps.basePlugins,
      }}
      onBlur={handleBlur}
    >
      <EditorChangePlugin setValue={onValueChange} />
    </EditorWrapper>
  );
};
