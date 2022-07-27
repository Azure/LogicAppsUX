import type { ArrayEditorItemProps } from '../../../arrayeditor';
import type { Segment } from '../../base';
import { BaseEditor } from '../../base';
import { Serialize } from '../../base/plugins/Serialize';
import { Validation } from '../../base/plugins/Validation';
import type { Dispatch, SetStateAction } from 'react';

export interface CollapsedEditorProps {
  isValid?: boolean;
  initialValue?: Segment[];
  type: 'EXPANDED_ARRAY' | 'COLLAPSED_ARRAY' | 'DICTIONARY';
  errorMessage: string;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
}

export const CollapsedEditor = ({
  isValid = true,
  errorMessage,
  initialValue,
  type,
  setItems,
  setIsValid,
}: CollapsedEditorProps): JSX.Element => {
  return (
    <BaseEditor
      className="msla-array-editor-container-collapsed"
      BasePlugins={{
        tokens: true,
      }}
      tokenPickerClassName={'msla-collapsed-array-editor-tokenpicker'}
      placeholder={'Enter an Array'}
      initialValue={initialValue}
    >
      <Serialize isValid={isValid} setItems={setItems} />
      <Validation type={type} errorMessage={errorMessage} className={'msla-array-editor-validation'} isValid setIsValid={setIsValid} />
    </BaseEditor>
  );
};
