import { mergeClasses } from '@fluentui/react-components';
import type { ComboboxItem } from '../combobox';
import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps, CallbackHandler, CastHandler, GetTokenPickerHandler } from '../editor/base';
import { CollapsedArray } from './collapsedarray';
import { ExpandedComplexArray } from './expandedcomplexarray';
import { ExpandedSimpleArray } from './expandedsimplearray';
import { parseComplexItems, parseSimpleItems } from './util/serializecollapsedarray';
import type { ItemSchemaItemProps } from './util/util';
import { getOneDimensionalSchema, initializeComplexArrayItems, initializeSimpleArrayItems } from './util/util';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export const ArrayType = {
  COMPLEX: 'complex',
  SIMPLE: 'simple',
} as const;
export const InitialMode = {
  Array: 'array',
  Items: 'items',
};

export type ArrayType = (typeof ArrayType)[keyof typeof ArrayType];

export interface ArrayItemSchema {
  type: string;
  key: string;
  title?: string;
  properties?: Record<string, ArrayItemSchema>;
  items?: ArrayItemSchema;
  required?: string[];
  description?: string;
  format?: string;
  enum?: string[];
  readOnly?: boolean;
  [index: string]: any;
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
  // Required Props
  arrayType: ArrayType;
  itemSchema: ArrayItemSchema;
  // Behavior
  canDeleteLastItem?: boolean;
  disableToggle?: boolean;
  initialMode?: string;
  isDynamic?: boolean;
  isLoading?: boolean;
  isRequired?: boolean;
  suppressCastingForSerialize?: boolean;
  // Data
  options?: ComboboxItem[];
  // Event Handlers
  castParameter: CastHandler;
  getTokenPicker?: GetTokenPickerHandler;
  onMenuOpen?: CallbackHandler;
  // Error Handling
  errorDetails?: { message: string };
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  canDeleteLastItem = true,
  disableToggle = false,
  initialValue,
  arrayType,
  initialMode,
  label,
  itemSchema,
  placeholder,
  dataAutomationId,
  suppressCastingForSerialize,
  isRequired = false,
  getTokenPicker,
  onChange,
  castParameter,
  ...baseEditorProps
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState<boolean>(initialMode === InitialMode.Array);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [items, setItems] = useState<ComplexArrayItems[] | SimpleArrayItem[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);
  const intl = useIntl();

  const isComplex = useMemo(() => arrayType === ArrayType.COMPLEX, [arrayType]);

  const dimensionalSchema: ItemSchemaItemProps[] = useMemo(() => {
    if (!isComplex) {
      return [];
    }
    return getOneDimensionalSchema(itemSchema, isRequired);
  }, [isComplex, isRequired, itemSchema]);

  useEffect(() => {
    arrayType === ArrayType.COMPLEX
      ? initializeComplexArrayItems(initialValue, itemSchema, setItems, setIsValid, setCollapsed)
      : initializeSimpleArrayItems(initialValue, itemSchema.type, setItems, setIsValid, setCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // serialize simple expanded array
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

  // serialize complex expanded array
  const updateComplexItems = (newItems: ComplexArrayItems[]) => {
    setItems(newItems);
    // we want to supress casting for when switching between expanded and collapsed array, but cast when serializing
    const objectValue = parseComplexItems(newItems, itemSchema, isRequired, castParameter, suppressCastingForSerialize);
    const { castedValue, uncastedValue } = objectValue;
    setCollapsedValue(uncastedValue);
    if (!collapsed) {
      onChange?.({
        value: suppressCastingForSerialize ? uncastedValue : castedValue,
        viewModel: { arrayType, itemSchema, uncastedValue },
      });
    }
  };

  // serialize collapsed array
  const handleBlur = (): void => {
    onChange?.({
      value: collapsedValue,
      viewModel: { arrayType, itemSchema, uncastedValue: collapsedValue },
    });
  };

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to input entire array',
    id: 'EdeHLs',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to detail inputs for array item',
    id: 'HfinO2',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  const arrayItemLabel = intl.formatMessage(
    {
      defaultMessage: '{label} Item',
      id: 'fBUCrA',
      description: 'Label for array item',
    },
    { label }
  );

  const defaultArrayItemLabel = intl.formatMessage({
    defaultMessage: 'Array Item',
    id: 'gS4Teq',
    description: 'Label for array item',
  });

  return (
    <div className={mergeClasses('msla-array-editor-container', baseEditorProps.className)} data-automation-id={dataAutomationId}>
      {collapsed ? (
        <CollapsedArray
          {...baseEditorProps}
          isValid={isValid}
          collapsedValue={collapsedValue}
          itemSchema={itemSchema}
          isComplex={isComplex}
          setItems={isComplex ? updateComplexItems : updateSimpleItems}
          setIsValid={setIsValid}
          onBlur={handleBlur}
          setCollapsedValue={setCollapsedValue}
          getTokenPicker={getTokenPicker}
        />
      ) : isComplex ? (
        <ExpandedComplexArray
          {...baseEditorProps}
          dimensionalSchema={dimensionalSchema}
          allItems={items as ComplexArrayItems[]}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateComplexItems}
          getTokenPicker={getTokenPicker}
        />
      ) : (
        <ExpandedSimpleArray
          {...baseEditorProps}
          isRequired={isRequired}
          placeholder={placeholder}
          valueType={itemSchema.type}
          itemEnum={itemSchema.enum}
          items={items as SimpleArrayItem[]}
          labelProps={{ text: label ? arrayItemLabel : defaultArrayItemLabel }}
          canDeleteLastItem={canDeleteLastItem}
          setItems={updateSimpleItems}
          getTokenPicker={getTokenPicker}
        />
      )}
      <div className="msla-array-commands">
        {disableToggle ? null : (
          <EditorCollapseToggle
            label={collapsed ? collapsedLabel : expandedLabel}
            collapsed={collapsed}
            disabled={!isValid && collapsed}
            toggleCollapsed={toggleCollapsed}
          />
        )}
      </div>
    </div>
  );
};
