/* eslint-disable @typescript-eslint/no-unused-vars */
import type { EventHandler } from '../../../eventhandler';
import { Label } from '../../../label';
import { SimpleDictionaryItem } from './simpledictionaryitem';
import type { SimpleDictionaryItemProps, SimpleDictionaryRowModel, SimpleDictionaryChangeModel } from './simpledictionaryitem';
import { guid } from '@microsoft-logic-apps/utils';
import { useDebouncedEffect } from '@react-hookz/web';
import React, { useEffect, useState } from 'react';

export interface SimpleDictionaryProps {
  disabled?: boolean;
  title?: string;
  readOnly?: boolean;
  value?: Record<string, string>;
  onChange?: EventHandler<Record<string, string> | undefined>;
}

export const SimpleDictionary: React.FC<SimpleDictionaryProps> = ({ disabled, title, readOnly, value, onChange }): JSX.Element => {
  const [values, setValues] = useState([
    ...Object.entries(value ?? {}).map(([key, value], index) => ({
      key,
      value,
      index,
    })),
    { key: '', value: '', index: Object.keys(value ?? {}).length },
  ]);

  useDebouncedEffect(
    () => {
      onChange?.(
        values
          .filter((x) => x.key && x.key !== '')
          .reduce((acc, val) => {
            return {
              ...acc,
              [val.key]: val.value,
            };
          }, {})
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values],
    500,
    1000
  );

  const handleItemDelete = (e: SimpleDictionaryRowModel): void => {
    setValues((oldValues) => oldValues.filter((x) => x.index !== e.index).map((x, i) => ({ ...x, index: i })));
  };

  const handleItemChange = (e: SimpleDictionaryChangeModel): void => {
    setValues((oldValues) => {
      const newValues = oldValues.map((v) => {
        if (v.index === e.index) {
          return {
            ...v,
            key: e.key,
            value: e.value,
          };
        }
        return v;
      });
      if (e.index + 1 === oldValues.length) {
        newValues.push({ key: '', value: '', index: e.index + 1 });
      }
      return newValues;
    });
  };

  console.log(values);
  return (
    <>
      {values.map((x) => (
        <SimpleDictionaryItem
          item={{ key: x.key, value: x.value, index: x.index }}
          key={x.index}
          allowDeletion={x.index + 1 !== values.length}
          disabled={disabled}
          readOnly={readOnly}
          onDelete={handleItemDelete}
          onChange={handleItemChange}
        />
      ))}
    </>
  );
};
