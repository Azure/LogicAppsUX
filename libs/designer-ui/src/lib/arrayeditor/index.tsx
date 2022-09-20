import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeArrayValidation } from '../editor/base/utils/helper';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedArray } from './expandedarray';
import { parseInitialValue } from './util/serializecollapsedarray';
import { useState } from 'react';

export interface ArrayEditorItemProps {
  key?: string;
  content: ValueSegment[];
}

export interface ArrayEditorProps extends BaseEditorProps {
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  initialItems?: ArrayEditorItemProps[];
  labelProps: LabelProps;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  initialItems = [],
  labelProps,
  GetTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState<boolean>(initializeArrayValidation(initialValue));
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: ArrayEditorItemProps[]) => {
    setItems(newItems);
    const objectValue = parseInitialValue(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue, viewModel: { items: newItems } });
    }
  };

  const handleBlur = (): void => {
    onChange?.({ value: collapsedValue, viewModel: { items: isValid ? items : undefined } });
  };

  return (
    <div className="msla-array-editor-container">
      {collapsed || !initialItems ? (
        <CollapsedArray
          labelProps={labelProps}
          isValid={isValid}
          collapsedValue={collapsedValue}
          isTrigger={baseEditorProps.isTrigger}
          readOnly={baseEditorProps.readonly}
          setItems={updateItems}
          setIsValid={setIsValid}
          GetTokenPicker={GetTokenPicker}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
        />
      ) : (
        <ExpandedArray
          items={items}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          isTrigger={baseEditorProps.isTrigger}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateItems}
          GetTokenPicker={GetTokenPicker}
        />
      )}
      <div className="msla-array-commands">
        {!disableToggle ? (
          <EditorCollapseToggle collapsed={collapsed} disabled={!isValid || baseEditorProps.readonly} toggleCollapsed={toggleCollapsed} />
        ) : null}
      </div>
    </div>
  );
};
