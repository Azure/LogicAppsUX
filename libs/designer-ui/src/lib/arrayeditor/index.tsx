import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import { getOneDimensionalSchema, initializeComplexArrayItems, initializeSimpleArrayItems } from './util/util';
import { useEffect, useState } from 'react';

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
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  labelProps: LabelProps;
  itemSchema?: unknown;
  type: ArrayType.COMPLEX | ArrayType.SIMPLE;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  type,
  labelProps,
  itemSchema,
  tokenPickerHandler,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [items, setItems] = useState<ComplexArrayItems[] | SimpleArrayItem[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);
  let dimensionalSchema: unknown[] = [];
  if (type === ArrayType.COMPLEX) {
    dimensionalSchema = getOneDimensionalSchema(itemSchema);
  }

  useEffect(() => {
    type === ArrayType.COMPLEX
      ? initializeComplexArrayItems(initialValue, dimensionalSchema, setItems, setIsValid, setCollapsed)
      : initializeSimpleArrayItems(initialValue, setItems, setIsValid, setCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateSimpleItems = (newItems: SimpleArrayItem[]) => {
    setItems(newItems);
    const objectValue = parseSimpleItems(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue });
    }
  };

  const updateComplexItems = (newItems: ComplexArrayItems[]) => {
    setItems(newItems);
    if (type === ArrayType.COMPLEX) {
      const objectValue = parseComplexItems(newItems, itemSchema);
      setCollapsedValue(objectValue);
      if (!collapsed) {
        onChange?.({ value: objectValue });
      }
    }
  };

  const handleBlur = (): void => {
    onChange?.({ value: collapsedValue });
  };

  return (
    <div className="msla-array-editor-container">
      {collapsed ? (
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
          <EditorCollapseToggle
            collapsed={collapsed}
            disabled={(!isValid || baseEditorProps.readonly) && collapsed}
            toggleCollapsed={toggleCollapsed}
          />
        ) : null}
      </div>
    </div>
  );
};
