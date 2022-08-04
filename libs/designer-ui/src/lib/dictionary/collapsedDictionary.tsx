import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import { ValueSegmentType, CollapsedEditor, CollapsedEditorType } from '../editor';
import type { TokenGroup } from '../tokenpicker/models/token';
import { isEmpty } from './util/helper';
import { guid } from '@microsoft-logic-apps/utils';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  items: DictionaryEditorItemProps[];
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  tokenGroup?: TokenGroup[];
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
};

export const CollapsedDictionary = ({
  items,
  isValid,
  collapsedValue,
  tokenGroup,
  setItems,
  setIsValid,
  setCollapsedValue,
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
          initialValue={parseInitialValue(
            items.filter((item) => {
              return !isEmpty(item);
            })
          )}
          errorMessage={errorMessage}
          collapsedValue={collapsedValue}
          tokenGroup={tokenGroup}
          setItems={setItems}
          setIsValid={setIsValid}
          setCollapsedValue={setCollapsedValue}
        />
      </div>
    </div>
  );
};

// convert from DictionaryEditorItemProps array to Segment array
const parseInitialValue = (items: DictionaryEditorItemProps[]): ValueSegment[] | undefined => {
  items.filter((item) => {
    return !isEmpty(item);
  });
  if (items.length === 0) {
    return;
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '{\n  "' });
  items.forEach((item, index) => {
    const { key, value } = item;
    key.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' });
    value.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n}' });
  });
  return parsedItems;
};
