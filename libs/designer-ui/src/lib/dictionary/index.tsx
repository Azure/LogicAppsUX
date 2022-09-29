import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeDictionaryValidation } from '../editor/base/utils/helper';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
import { convertItemsToSegments } from './util/deserializecollapseddictionary';
import { useState } from 'react';

export enum DictionaryType {
  DEFAULT = 'default',
  TABLE = 'table',
}
export interface DictionaryEditorItemProps {
  key: ValueSegment[];
  value: ValueSegment[];
}

export interface DictionaryEditorProps extends BaseEditorProps {
  disableToggle?: boolean;
  initialItems?: DictionaryEditorItemProps[];
  keyTitle?: string;
  valueTitle?: string;
  dictionaryType?: DictionaryType;
}

export const DictionaryEditor: React.FC<DictionaryEditorProps> = ({
  disableToggle = false,
  initialItems,
  initialValue,
  keyTitle,
  valueTitle,
  dictionaryType = DictionaryType.DEFAULT,
  GetTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(!initialItems ?? false);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [isValid, setIsValid] = useState(initializeDictionaryValidation(initialValue));

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

  const handleBlur = (): void => {
    onChange?.({ value: collapsedValue, viewModel: { items: isValid ? items : undefined } });
  };

  return (
    <div className="msla-dictionary-editor-container">
      {collapsed && !(dictionaryType === DictionaryType.TABLE) ? (
        <CollapsedDictionary
          isValid={isValid}
          isTrigger={baseEditorProps.isTrigger}
          readonly={baseEditorProps.readonly}
          collapsedValue={collapsedValue}
          GetTokenPicker={GetTokenPicker}
          setItems={updateItems}
          setIsValid={setIsValid}
          setCollapsedValue={(val: ValueSegment[]) => setCollapsedValue(val)}
          onBlur={handleBlur}
        />
      ) : (
        <ExpandedDictionary
          items={items ?? [{ key: [], value: [] }]}
          isTrigger={baseEditorProps.isTrigger}
          readonly={baseEditorProps.readonly}
          keyTitle={keyTitle}
          valueTitle={valueTitle}
          setItems={updateItems}
          GetTokenPicker={GetTokenPicker}
        />
      )}

      <div className="msla-dictionary-commands">
        {!disableToggle && !(dictionaryType === DictionaryType.TABLE) ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || baseEditorProps.readonly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
