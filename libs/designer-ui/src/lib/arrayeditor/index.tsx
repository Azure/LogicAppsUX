import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps, CastHandler } from '../editor/base';
import type { LabelProps } from '../label';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import type { ItemSchemaItemProps } from './util/util';
import { getOneDimensionalSchema, initializeComplexArrayItems, initializeSimpleArrayItems } from './util/util';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

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
  arrayType: ArrayType;
  castParameter: CastHandler;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  arrayType,
  labelProps,
  itemSchema,
  placeholder,
  dataAutomationId,
  getTokenPicker,
  onChange,
  castParameter,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [items, setItems] = useState<ComplexArrayItems[] | SimpleArrayItem[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);
  const intl = useIntl();

  const isComplex = useMemo(() => arrayType === ArrayType.COMPLEX, [arrayType]);

  const dimensionalSchema: ItemSchemaItemProps[] = useMemo(() => {
    if (!isComplex) return [];
    return getOneDimensionalSchema(itemSchema);
  }, [isComplex, itemSchema]);

  useEffect(() => {
    arrayType === ArrayType.COMPLEX
      ? initializeComplexArrayItems(initialValue, itemSchema, setItems, setIsValid, setCollapsed)
      : initializeSimpleArrayItems(initialValue, itemSchema.type, setItems, setIsValid, setCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateSimpleItems = (newItems: SimpleArrayItem[]) => {
    setItems(newItems);
    const objectValue = parseSimpleItems(newItems, itemSchema, castParameter);
    const { castedValue, uncastedValue } = objectValue;
    setCollapsedValue(uncastedValue);
    if (!collapsed) {
      onChange?.({
        value: castedValue,
        viewModel: { arrayType, itemSchema, uncastedValue },
      });
    }
  };

  const updateComplexItems = (newItems: ComplexArrayItems[]) => {
    setItems(newItems);
    // we want to supress casting for when switching between expanded and collapsed array, but cast when serializing
    const objectValue = parseComplexItems(newItems, itemSchema, castParameter);
    const { castedValue, uncastedValue } = objectValue;
    setCollapsedValue(uncastedValue);
    if (!collapsed) {
      onChange?.({
        value: castedValue,
        viewModel: { arrayType, itemSchema, uncastedValue },
      });
    }
  };

  const handleBlur = (): void => {
    onChange?.({
      value: collapsedValue,
      viewModel: { arrayType, itemSchema, uncastedValue: collapsedValue },
    });
  };

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to input entire array',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to detail inputs for array item',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  return (
    <div className="msla-array-editor-container" data-automation-id={dataAutomationId}>
      {collapsed ? (
        <CollapsedArray
          labelProps={labelProps}
          isValid={isValid}
          collapsedValue={collapsedValue}
          readOnly={baseEditorProps.readonly}
          itemSchema={itemSchema}
          isComplex={isComplex}
          setItems={isComplex ? updateComplexItems : updateSimpleItems}
          setIsValid={setIsValid}
          getTokenPicker={getTokenPicker}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
        />
      ) : isComplex ? (
        <ExpandedComplexArray
          dimensionalSchema={dimensionalSchema}
          allItems={items as ComplexArrayItems[]}
          readOnly={baseEditorProps.readonly}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateComplexItems}
          getTokenPicker={getTokenPicker}
        />
      ) : (
        <ExpandedSimpleArray
          placeholder={placeholder}
          valueType={itemSchema.type}
          items={items as SimpleArrayItem[]}
          labelProps={labelProps}
          readOnly={baseEditorProps.readonly}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateSimpleItems}
          getTokenPicker={getTokenPicker}
        />
      )}
      <div className="msla-array-commands">
        {!disableToggle ? (
          <EditorCollapseToggle
            label={collapsed ? collapsedLabel : expandedLabel}
            collapsed={collapsed}
            disabled={!isValid && collapsed}
            toggleCollapsed={toggleCollapsed}
          />
        ) : null}
      </div>
    </div>
  );
};
