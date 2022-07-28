import type { DictionaryEditorItemProps } from '.';
import { ValueSegmentType, CollapsedEditor, CollapsedEditorType } from '../editor';
import type { Segment } from '../editor/base';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  items: DictionaryEditorItemProps[];
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems: (items: DictionaryEditorItemProps[]) => void;
};

export const CollapsedDictionary = ({ items, isValid = true, setItems, setIsValid }: CollapsedDictionaryProps): JSX.Element => {
  const intl = useIntl();

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please Enter a valid array',
    description: 'Error Message for Invalid Array',
  });

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-collapsed">
      <div className="msla-dictionary-content">
        <CollapsedEditor
          type={CollapsedEditorType.DICTIONARY}
          isValid={isValid}
          initialValue={parseInitialValue(items)}
          errorMessage={errorMessage}
          setItems={setItems}
          setIsValid={setIsValid}
        />
      </div>
    </div>
  );
};

const parseInitialValue = (items: DictionaryEditorItemProps[]): Segment[] => {
  if (items.length === 0) {
    return [{ type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const parsedItems: Segment[] = [];
  parsedItems.push({ type: ValueSegmentType.LITERAL, value: '[\n  "' });
  items.forEach((item, index) => {
    const { key, value } = item;
    key.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: '" : "' });
    value.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n]' });
  });
  return parsedItems;
};
