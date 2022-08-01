import type { DictionaryEditorItemProps } from '.';
import { ValueSegmentType, CollapsedEditor, CollapsedEditorType } from '../editor';
import type { Segment } from '../editor/base';
import { isEmpty } from './util/helper';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  items: DictionaryEditorItemProps[];
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems: (items: DictionaryEditorItemProps[]) => void;
};

export const CollapsedDictionary = ({ items, isValid, setItems, setIsValid }: CollapsedDictionaryProps): JSX.Element => {
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
          initialValue={parseInitialValue(
            items.filter((item) => {
              return !isEmpty(item);
            })
          )}
          errorMessage={errorMessage}
          setItems={setItems}
          setIsValid={setIsValid}
        />
      </div>
    </div>
  );
};

// convert from DictionaryEditorItemProps array to Segment array
const parseInitialValue = (items: DictionaryEditorItemProps[]): Segment[] => {
  items.filter((item) => {
    return !isEmpty(item);
  });
  if (items.length === 0) {
    return [{ type: ValueSegmentType.LITERAL, value: '{}' }];
  }
  const parsedItems: Segment[] = [];
  parsedItems.push({ type: ValueSegmentType.LITERAL, value: '{\n  "' });
  items.forEach((item, index) => {
    const { key, value } = item;
    key.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: '" : "' });
    value.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n}' });
  });
  return parsedItems;
};
