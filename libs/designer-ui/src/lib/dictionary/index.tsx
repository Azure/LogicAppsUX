import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
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
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState((!initialItems && initialValue && initialValue.length > 0) ?? false);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue ?? []);
  const [isValid, setIsValid] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: DictionaryEditorItemProps[]) => {
    setItems(newItems);
    setCollapsedValue([]);
  };

  const updateCollapsedValue = (val: ValueSegment[]) => {
    setCollapsedValue(val);
  };

  return (
    <div className="msla-dictionary-editor-container">
      {collapsed || collapsedValue.length > 0 ? (
        <CollapsedDictionary
          items={items ?? [{ key: [], value: [] }]}
          isValid={isValid}
          setItems={updateItems}
          setIsValid={setIsValid}
          collapsedValue={collapsedValue}
          setCollapsedValue={updateCollapsedValue}
        />
      ) : (
        <ExpandedDictionary items={items ?? [{ key: [], value: [] }]} setItems={updateItems} />
      )}

      <div className="msla-array-commands">
        {!disableToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || readOnly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
