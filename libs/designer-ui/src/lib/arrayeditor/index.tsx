import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import type { ItemSchemaItemProps } from './util/util';
import { getOneDimensionalSchema, initializeComplexArrayItems, initializeSimpleArrayItems } from './util/util';
import { useEffect, useMemo, useState } from 'react';

export enum ArrayType {
  COMPLEX = 'complex',
  SIMPLE = 'simple',
}

export interface ArrayItemSchema {
  type: string;
  key: string;
  title?: string;
  properties?: Record<string, ArrayItemSchema>;
  items?: ArrayItemSchema;
  required?: string[];
  description?: string;
  format?: string;
}

export interface ComplexArrayItem {
  key: string;
  title: string;
  description: string;
  value: ValueSegment[];
  arrayItems?: ComplexArrayItems[];
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

export interface ArrayEditorProps extends BaseEditorProps {
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  labelProps: LabelProps;
  itemSchema: ArrayItemSchema;
  type: ArrayType.COMPLEX | ArrayType.SIMPLE;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  type,
  labelProps,
  itemSchema,
  placeholder,
  getTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [items, setItems] = useState<ComplexArrayItems[] | SimpleArrayItem[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);

  const dimensionalSchema: ItemSchemaItemProps[] = useMemo(() => {
    if (type === ArrayType.SIMPLE) return [];
    console.log(getOneDimensionalSchema(itemSchema));
    return getOneDimensionalSchema(itemSchema);
  }, [itemSchema, type]);

  useEffect(() => {
    type === ArrayType.COMPLEX
      ? initializeComplexArrayItems(initialValue, itemSchema, setItems, setIsValid, setCollapsed)
      : initializeSimpleArrayItems(initialValue, setItems, setIsValid, setCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensionalSchema]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateSimpleItems = (newItems: SimpleArrayItem[]) => {
    setItems(newItems);
    const objectValue = parseSimpleItems(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({
        value: objectValue,
      });
    }
  };

  const updateComplexItems = (newItems: ComplexArrayItems[]) => {
    setItems(newItems);
    if (type === ArrayType.COMPLEX) {
      console.log(newItems);
      const objectValue = parseComplexItems(newItems, itemSchema);
      console.log(objectValue);
      setCollapsedValue(objectValue);
      if (!collapsed) {
        onChange?.({
          value: objectValue,
        });
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
          setItems={type === ArrayType.SIMPLE ? updateSimpleItems : updateComplexItems}
          setIsValid={setIsValid}
          getTokenPicker={getTokenPicker}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
        />
      ) : type === ArrayType.SIMPLE ? (
        <ExpandedSimpleArray
          placeholder={placeholder}
          valueType={itemSchema.type}
          items={items as SimpleArrayItem[]}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          isTrigger={baseEditorProps.isTrigger}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateSimpleItems}
          getTokenPicker={getTokenPicker}
        />
      ) : (
        <ExpandedComplexArray
          dimensionalSchema={dimensionalSchema}
          allItems={items as ComplexArrayItems[]}
          readOnly={baseEditorProps.readonly}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateComplexItems}
          getTokenPicker={getTokenPicker}
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
