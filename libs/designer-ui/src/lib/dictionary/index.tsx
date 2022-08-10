import type { ValueSegment } from '../editor';
import { ValueSegmentType, EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeValidation } from '../editor/base/utils/helper';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
import { isEmpty } from './util/helper';
import { guid } from '@microsoft-logic-apps/utils';
import { useState } from 'react';

export interface DictionaryEditorItemProps {
  key: ValueSegment[];
  value: ValueSegment[];
}

export interface DictionaryEditorProps extends BaseEditorProps {
  disableToggle?: boolean;
  initialItems?: DictionaryEditorItemProps[];
  type?: string;
  readOnly?: boolean;
}

export const DictionaryEditor: React.FC<DictionaryEditorProps> = ({
  readOnly = false,
  disableToggle = false,
  initialItems,
  initialValue,
  tokenGroup,
  expressionGroup,
  onChange,
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(!initialItems ?? false);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [isValid, setIsValid] = useState(initializeValidation(initialValue));

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: DictionaryEditorItemProps[]) => {
    setItems(newItems);
    const objectValue = convertItemsToSegments(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue, viewModel: { items: newItems } });
    }
  };

  const updateCollapsedValue = (val: ValueSegment[]) => {
    setCollapsedValue(val);
  };

  const handleBlur = (): void => {
    onChange?.({ value: collapsedValue, viewModel: { items: isValid ? items : undefined } });
  };

  return (
    <div className="msla-dictionary-editor-container">
      {collapsed ? (
        <CollapsedDictionary
          isValid={isValid}
          tokenGroup={tokenGroup}
          expressionGroup={expressionGroup}
          collapsedValue={collapsedValue}
          setItems={updateItems}
          setIsValid={setIsValid}
          setCollapsedValue={updateCollapsedValue}
          onBlur={handleBlur}
        />
      ) : (
        <ExpandedDictionary
          items={items ?? [{ key: [], value: [] }]}
          setItems={updateItems}
          tokenGroup={tokenGroup}
          expressionGroup={expressionGroup}
        />
      )}

      <div className="msla-dictionary-commands">
        {!disableToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || readOnly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};

const convertItemsToSegments = (items: DictionaryEditorItemProps[]): ValueSegment[] => {
  const itemsToConvert = items.filter((item) => {
    return !isEmpty(item);
  });

  if (itemsToConvert.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '{\n  "' });

  for (let index = 0; index < itemsToConvert.length; index++) {
    const { key, value } = itemsToConvert[index];
    parsedItems.push(...key);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' });
    parsedItems.push(...value);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < itemsToConvert.length - 1 ? '",\n  "' : '"\n}' });
  }

  return parsedItems;
};
