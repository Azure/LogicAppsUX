// import Constants from '../constants';
import type { EventHandler } from  '../../../eventhandler'
import { Label } from  '../../../label'
import { SimpleDictionaryItem } from './simpledictionaryitem';
import type { SimpleDictionaryItemProps, SimpleDictionaryRowModel } from './simpledictionaryitem';
import { guid } from '@microsoft-logic-apps/utils';
import React, { useState } from 'react';

export interface SimpleDictionaryProps {
  disabled?: boolean;
  title?: string;
  readOnly?: boolean;
  value?: Record<string, string>;
  onChange?: EventHandler<Record<string, string> | undefined>;
}

const convertDictionaryToKeyValuePair = (value?: Record<string, string>): SimpleDictionaryRowModel[] => {
  const result: SimpleDictionaryRowModel[] = [];
  if (value) {
    for (const key of Object.keys(value)) {
      result.push({
        id: guid(),
        key,
        value: value[key],
      });
    }
  }

  result.push({
    id: guid(),
    key: undefined,
    value: undefined,
  });

  return result;
};

const convertItemsModelToDictionary = (items: SimpleDictionaryRowModel[]): Record<string, string> | undefined => {
  let result: Record<string, string> | undefined;
  let newItems = [...items];
  if (items[items.length - 1].value?.length === 1) {
    newItems = [...items, {id: guid(), key: '', value: '' }];
  }
  if (newItems.length > 0) {
    result = {};
    for (const item of newItems) {
      if (item.key !== undefined) {
        result[item.key] = item.value || '';
      }
    }

    // if (result[Object.keys(items)[items.length -1]].length === 1) {
    //   result.
    // }

    if (Object.keys(result).length === 0) {
      result = undefined;
    }
  }

  return result;
};

const renderLabel = (name: string, elementId: string): JSX.Element => (
  <div className="msla-input-parameter-label">
    <div className="msla-dictionary-control-label">
      <Label htmlFor={elementId} text={name} />
    </div>
  </div>
);

// const isRowEmpty = (item: SimpleDictionaryRowModel): boolean => !item.key && !item.value;

export const SimpleDictionary: React.FC<SimpleDictionaryProps> = ({ disabled, title, readOnly, value, onChange }): JSX.Element => {
  // eslint-disable-next-line no-unused-vars
  // const [controlValue, _setControlValue] = useState(value);
  const [items, setItems] = useState(convertDictionaryToKeyValuePair(value));

  const elementId = guid();

  // const getChangeHandler = () => handleItemChange;
  // const getCurrentPropertyValue = () => value;

  const handleItemDelete = (e: SimpleDictionaryRowModel): void => {
    const newItems = items.filter((item) => item.id !== e.id);
    setItems(newItems);

    if (e.key !== undefined && e.value !== undefined && onChange) {
      const newValue = convertItemsModelToDictionary(newItems);
      onChange(newValue);
    }
  };

  const handleItemChange = (e: SimpleDictionaryRowModel): void => {
    const newItems = [...items];
    for (const item of newItems) {
      if (item.id === e.id) {
        item.key = e.key;
        item.value = e.value;
        break;
      }
    }
    // setItems(newItems);

    if (onChange) {
      const newValue = convertItemsModelToDictionary(newItems);
      onChange(newValue);
    }
  };

  const renderDictionaryItem = (item: SimpleDictionaryRowModel, itemIndex: number, isLastItem: boolean): JSX.Element => {
    const props: SimpleDictionaryItemProps = {
      item,
      itemIndex: itemIndex + 1,
      isLastItem,
      disabled,
      readOnly,
      onDelete: handleItemDelete,
      onChange: handleItemChange,
      // onFocus: handleItemFocus,
    };

    return <SimpleDictionaryItem key={item.id} {...props} />;
  };

  const itemCount = items.length;
  const lastItemId = itemCount ? items[itemCount - 1].id : undefined;
  const renderedKeyValuePairs = items.map((item, index) => renderDictionaryItem(item, index, /* isLastItem */ item.id === lastItemId));
  const label = title ? renderLabel(title, elementId) : null;
  let parameterClassName = title
    ? 'msla-input-parameter-box msla-dictionary'
    : 'msla-input-parameter-box msla-input-parameter-box-no-label msla-dictionary';
  parameterClassName += ' msla-token-picker-non-dismissible-control';

  return (
    <div className="msla-simple-dictionary msla-input-parameter msla-dictionary-parameter">
      {label}
      <div id={elementId} className="msla-dictionary-container">
        <div className={parameterClassName}>{renderedKeyValuePairs}</div>
      </div>
    </div>
  );
};
