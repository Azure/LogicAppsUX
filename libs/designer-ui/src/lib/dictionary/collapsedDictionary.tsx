import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import { CollapsedEditor, CollapsedEditorType } from '../editor';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  collapsedValue: ValueSegment[];
  setCollapsedValue: (val: ValueSegment[]) => void;
  onBlur?: () => void;
};

export const CollapsedDictionary = ({
  isValid,
  setItems,
  setIsValid,
  collapsedValue,
  setCollapsedValue,
  onBlur,
}: CollapsedDictionaryProps): JSX.Element => {
  const intl = useIntl();

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid dictionary',
    description: 'Error Message for Invalid Dictionary',
  });

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-collapsed">
      <div className="msla-dictionary-content">
        <CollapsedEditor
          type={CollapsedEditorType.DICTIONARY}
          isValid={isValid}
          errorMessage={errorMessage}
          setItems={setItems}
          setIsValid={setIsValid}
          collapsedValue={collapsedValue}
          setCollapsedValue={setCollapsedValue}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
};
