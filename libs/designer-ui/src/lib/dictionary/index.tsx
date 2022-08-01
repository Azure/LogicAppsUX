import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps, Segment } from '../editor/base';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
import { useState } from 'react';

export interface DictionaryEditorItemProps {
  key: Segment[];
  value: Segment[];
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
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: DictionaryEditorItemProps[]) => {
    setItems(newItems);
  };

  return (
    <div className="msla-dictionary-editor-container">
      {collapsed || !initialItems ? (
        <CollapsedDictionary items={items as DictionaryEditorItemProps[]} isValid={isValid} setItems={updateItems} setIsValid={setIsValid} />
      ) : (
        <ExpandedDictionary items={items ?? []} setItems={updateItems} />
      )}

      <div className="msla-array-commands">
        {!disableToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || readOnly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
