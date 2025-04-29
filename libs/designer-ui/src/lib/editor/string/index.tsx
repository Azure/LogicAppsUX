import { css } from '@fluentui/utilities';
import type { BaseEditorProps, ChangeHandler } from '../base';
import { EditorWrapper } from '../base/EditorWrapper';
import { EditorChangePlugin } from '../base/plugins/EditorChange';
import { notEqual } from '../base/utils/helper';
import type { ValueSegment } from '../models/parameter';
import { useState } from 'react';

export interface StringEditorProps extends BaseEditorProps {
  clearEditorOnTokenInsertion?: boolean;
  editorBlur?: ChangeHandler;
  errorDetails?: {
    message: string;
  };
}

export const StringEditor = ({
  initialValue,
  clearEditorOnTokenInsertion,
  editorBlur,
  onChange,
  errorDetails,
  ...baseEditorProps
}: StringEditorProps) => {
  const [value, setValue] = useState(initialValue);

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
    onChange?.({ value: newValue, viewModel: { hideErrorMessage: true } });
  };

  const handleBlur = () => {
    if (notEqual(value, initialValue)) {
      editorBlur?.({ value });
    }
    onChange?.({ value, viewModel: { hideErrorMessage: false } });
  };

  return (
    <>
      <EditorWrapper
        {...baseEditorProps}
        initialValue={initialValue}
        className={css(baseEditorProps.className, errorDetails ? 'error' : '')}
        basePlugins={{
          clearEditor: clearEditorOnTokenInsertion,
          singleValueSegment: clearEditorOnTokenInsertion,
          ...baseEditorProps.basePlugins,
        }}
        onBlur={handleBlur}
      >
        <EditorChangePlugin setValue={onValueChange} />
      </EditorWrapper>
      {errorDetails && (
        <div className="msla-input-parameter-error">
          <svg fill="#b40e1b" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6 11A5 5 0 1 0 6 1a5 5 0 0 0 0 10Zm-.75-2.75a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Zm.26-4.84a.5.5 0 0 1 .98 0l.01.09v2.59a.5.5 0 0 1-1 0V3.41Z"
              fill="#b40e1b"
            ></path>
          </svg>
          {errorDetails.message}
        </div>
      )}
    </>
  );
};
