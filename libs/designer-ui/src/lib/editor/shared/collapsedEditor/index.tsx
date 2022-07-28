import type { ArrayEditorItemProps } from '../../../arrayeditor';
import { SerializeArray } from '../../../arrayeditor/plugins/SerializeArray';
import type { DictionaryEditorItemProps } from '../../../dictionary';
import type { Segment } from '../../base';
import { BaseEditor } from '../../base';
import { Validation } from '../../base/plugins/Validation';
import type { Dispatch, SetStateAction } from 'react';

export enum CollapsedEditorType {
  COLLAPSED_ARRAY = 'collapsed-array',
  DICTIONARY = 'dictionary',
}

type CollapsedEditorBaseProps = {
  isValid?: boolean;
  initialValue?: Segment[];
  errorMessage: string;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
};

export type CollapsedEditorProps = CollapsedEditorBaseProps &
  (
    | {
        type: CollapsedEditorType.COLLAPSED_ARRAY;
        setItems: (items: ArrayEditorItemProps[]) => void;
      }
    | {
        type: CollapsedEditorType.DICTIONARY;
        setItems: (items: DictionaryEditorItemProps[]) => void;
      }
  );

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
      className="msla-collapsed-editor-container"
      BasePlugins={{
        tokens: true,
      }}
      tokenPickerClassName={`msla-${type}-editor-tokenpicker`}
      placeholder={type === CollapsedEditorType.DICTIONARY ? 'Enter a Dictionary' : 'Enter an Array'}
      initialValue={initialValue}
    >
      {type === CollapsedEditorType.DICTIONARY ? null : <SerializeArray isValid={isValid} setItems={setItems} />}

      <Validation type={type} errorMessage={errorMessage} className={'msla-collapsed-editor-validation'} isValid setIsValid={setIsValid} />
    </BaseEditor>
  );
};
