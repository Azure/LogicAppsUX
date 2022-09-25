import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeArrayValidation } from '../editor/base/utils/helper';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import { useState } from 'react';

export enum ArrayType {
  COMPLEX = 'complex',
  SIMPLE = 'simple',
}
export interface ComplexArrayItem {
  key: string;
  visibility?: string;
  value: ValueSegment[][];
}

export interface SimpleArrayItem {
  key: string;
  visibility?: string;
  value: ValueSegment[];
}

interface BaseArrayEditorProps extends BaseEditorProps {
  isCollapsed?: boolean;
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  labelProps: LabelProps;
}
export type ArrayEditorProps = BaseArrayEditorProps &
  (
    | {
        type: ArrayType.COMPLEX;
        initialItems: ComplexArrayItem[];
        itemSchema: string[];
      }
    | {
        type: ArrayType.SIMPLE;
        initialItems: SimpleArrayItem[];
        itemSchema?: string;
      }
  );

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  isCollapsed = false,
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  type,
  initialItems = [],
  labelProps,
  itemSchema,
  GetTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState<boolean>(initializeArrayValidation(initialValue));
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateSimpleItems = (newItems: SimpleArrayItem[]) => {
    setItems(newItems);
    const objectValue = parseSimpleItems(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue, viewModel: { items: newItems } });
    }
  };

  const updateComplexItems = (newItems: ComplexArrayItem[]) => {
    setItems(newItems);
    if (type === ArrayType.COMPLEX) {
      const objectValue = parseComplexItems(newItems, itemSchema);
      setCollapsedValue(objectValue);
      if (!collapsed) {
        onChange?.({ value: objectValue, viewModel: { items: newItems } });
      }
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
          itemSchema={itemSchema}
          setItems={type === ArrayType.SIMPLE ? updateSimpleItems : updateComplexItems}
          setIsValid={setIsValid}
          GetTokenPicker={GetTokenPicker}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
        />
      ) : type === ArrayType.SIMPLE ? (
        <ExpandedSimpleArray
          itemSchema={itemSchema}
          items={items as SimpleArrayItem[]}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          isTrigger={baseEditorProps.isTrigger}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateSimpleItems}
          GetTokenPicker={GetTokenPicker}
        />
      ) : (
        <ExpandedComplexArray
          itemSchema={itemSchema}
          items={items as ComplexArrayItem[]}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          isTrigger={baseEditorProps.isTrigger}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateComplexItems}
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
