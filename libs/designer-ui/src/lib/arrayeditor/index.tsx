import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeArrayValidation } from '../editor/base/utils/helper';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import { getOneDimensionalSchema } from './util/util';
import { useState } from 'react';

export enum ArrayType {
  COMPLEX = 'complex',
  SIMPLE = 'simple',
}

export interface ComplexArrayItem {
  title: string;
  value: ValueSegment[];
}
export interface ComplexArrayItems {
  key: string;
  visibility?: string;
  items: ComplexArrayItem[];
}

export interface SimpleArrayItem {
  key: string;
  visibility?: string;
  value: ValueSegment[];
}

interface ArrayEditorProps extends BaseEditorProps {
  isCollapsed?: boolean;
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  labelProps: LabelProps;
  itemSchema?: any;
  type: ArrayType.COMPLEX | ArrayType.SIMPLE;
  initialItems: ComplexArrayItems[] | SimpleArrayItem[];
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  isCollapsed = false,
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  type,
  initialItems = [],
  labelProps,
  itemSchema,
  tokenPickerHandler,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(
    initialItems
      ? type === ArrayType.SIMPLE
        ? parseSimpleItems(initialItems as SimpleArrayItem[])
        : parseComplexItems(initialItems as ComplexArrayItems[], itemSchema)
      : initialValue
  );
  const [isValid, setIsValid] = useState<boolean>(initializeArrayValidation(collapsedValue));

  let dimensionalSchema: any[] = [];

  if (type === ArrayType.COMPLEX) {
    dimensionalSchema = getOneDimensionalSchema(itemSchema);
  }

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

  const updateComplexItems = (newItems: ComplexArrayItems[]) => {
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
          dimensionalSchema={dimensionalSchema}
          setItems={type === ArrayType.SIMPLE ? updateSimpleItems : updateComplexItems}
          setIsValid={setIsValid}
          tokenPickerHandler={tokenPickerHandler}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
        />
      ) : type === ArrayType.SIMPLE ? (
        <ExpandedSimpleArray
          items={items as SimpleArrayItem[]}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          isTrigger={baseEditorProps.isTrigger}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateSimpleItems}
          tokenPickerHandler={tokenPickerHandler}
        />
      ) : (
        <ExpandedComplexArray
          dimensionalSchema={dimensionalSchema}
          allItems={items as ComplexArrayItems[]}
          readOnly={baseEditorProps.readonly}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateComplexItems}
          tokenPickerHandler={tokenPickerHandler}
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
