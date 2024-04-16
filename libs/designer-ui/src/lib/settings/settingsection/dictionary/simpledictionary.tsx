/* eslint-disable @typescript-eslint/no-unused-vars */
import type { EventHandler } from '../../../eventhandler';
import { useId } from '../../../useId';
import { SimpleDictionaryItem } from './simpledictionaryitem';
import type { SimpleDictionaryRowModel, SimpleDictionaryChangeModel } from './simpledictionaryitem';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface SimpleDictionaryProps {
  disabled?: boolean;
  customLabel?: JSX.Element;
  readOnly?: boolean;
  value?: Record<string, string>;
  ariaLabel?: string;
  onChange?: EventHandler<Record<string, string> | undefined>;
}

export const SimpleDictionary: React.FC<SimpleDictionaryProps> = ({
  disabled,
  customLabel,
  readOnly,
  value,
  onChange,
  ariaLabel,
}): JSX.Element => {
  const [values, setValues] = useState([
    ...Object.entries(value ?? {}).map(([key, value], index) => ({
      key,
      value,
      index,
    })),
    { key: '', value: '', index: Object.keys(value ?? {}).length },
  ]);

  const intl = useIntl();
  useEffect(() => {
    onChange?.(
      values
        .filter((x) => x.key && x.key !== '')
        .reduce((acc: any, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {})
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

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

  const dictionaryFieldID = useId('anInput');

  const indexItem = intl.formatMessage({
    defaultMessage: 'item',
    id: 'NFgfP4',
    description: 'Label for users to know which item they are on in the dictionary',
  });

  return (
    <>
      {customLabel ? customLabel : null}
      <div id={dictionaryFieldID}>
        {values.map((x) => (
          <SimpleDictionaryItem
            item={{ key: x.key, value: x.value, index: x.index }}
            key={x.index}
            ariaLabel={`${ariaLabel} ${indexItem} ${x.index + 1}`}
            allowDeletion={x.index + 1 !== values.length}
            disabled={disabled}
            readOnly={readOnly}
            onDelete={handleItemDelete}
            onChange={handleItemChange}
          />
        ))}
      </div>
    </>
  );
};
