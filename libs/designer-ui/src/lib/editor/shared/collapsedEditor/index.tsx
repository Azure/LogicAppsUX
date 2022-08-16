import type { ArrayEditorItemProps } from '../../../arrayeditor';
import { SerializeArray } from '../../../arrayeditor/plugins/SerializeArray';
import type { DictionaryEditorItemProps } from '../../../dictionary';
import { BaseEditor } from '../../base';
import { Validation } from '../../base/plugins/Validation';
import type { ValueSegment } from '../../models/parameter';
import type { Dispatch, SetStateAction } from 'react';

export enum CollapsedEditorType {
  COLLAPSED_ARRAY = 'collapsed-array',
  DICTIONARY = 'dictionary',
}

interface CollapsedEditorBaseProps {
  isValid?: boolean;
  initialValue?: ValueSegment[];
  errorMessage: string;
  collapsedValue?: ValueSegment[];
  GetTokenPicker: (editorId: string, labelId: string, intitialExpression?: string, onClick?: (b: boolean) => void) => JSX.Element;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setCollapsedValue?: (val: ValueSegment[]) => void;
  onBlur?: () => void;
}

interface ColapsedEditorArrayProps {
  type: CollapsedEditorType.COLLAPSED_ARRAY;
  setItems: (items: ArrayEditorItemProps[]) => void;
}

interface CollapsedEditorDictionaryProps {
  type: CollapsedEditorType.DICTIONARY;
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

type CollapsedEditorProps = CollapsedEditorBaseProps & (ColapsedEditorArrayProps | CollapsedEditorDictionaryProps);

export const CollapsedEditor = ({
  isValid = true,
  errorMessage,
  initialValue,
  type,
  collapsedValue,
  GetTokenPicker,
  setIsValid,
  setItems,
  setCollapsedValue,
  onBlur,
}: CollapsedEditorProps): JSX.Element => {
  return (
    <BaseEditor
      className="msla-collapsed-editor-container"
      BasePlugins={{
        tokens: true,
      }}
      tokenPickerButtonProps={{ buttonClassName: `msla-${type}-editor-tokenpicker` }}
      placeholder={type === CollapsedEditorType.DICTIONARY ? 'Enter a Dictionary' : 'Enter an Array'}
      initialValue={collapsedValue && collapsedValue.length > 0 ? collapsedValue : (initialValue as ValueSegment[])}
      onBlur={onBlur}
      GetTokenPicker={GetTokenPicker}
    >
      {type === CollapsedEditorType.DICTIONARY ? null : <SerializeArray isValid={isValid} setItems={setItems} />}

      <Validation
        type={type}
        errorMessage={errorMessage}
        className={'msla-collapsed-editor-validation'}
        isValid={isValid}
        setIsValid={setIsValid}
        setItems={type === CollapsedEditorType.DICTIONARY ? setItems : undefined}
        collapsedValue={collapsedValue}
        setCollapsedValue={setCollapsedValue}
      />
    </BaseEditor>
  );
};
