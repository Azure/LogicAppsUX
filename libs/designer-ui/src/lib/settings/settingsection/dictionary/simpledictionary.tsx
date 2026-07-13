import type { EventHandler } from '../../../eventhandler';
import { useId } from '../../../useId';
import { SimpleDictionaryItem } from './simpledictionaryitem';
import type { SimpleDictionaryRowModel, SimpleDictionaryChangeModel } from './simpledictionaryitem';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './simpledictionary.styles';
import { equals } from '@microsoft/logic-apps-shared';

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
  const createValues = (dictionaryValue?: Record<string, string>) => [
    ...Object.entries(dictionaryValue ?? {}).map(([key, value], index) => ({
      key,
      value,
      index,
    })),
    { key: '', value: '', index: Object.keys(dictionaryValue ?? {}).length },
  ];

  const valuesToDictionary = (dictionaryRows: SimpleDictionaryRowModel[]): Record<string, string> | undefined => {
    const nextDictionary = dictionaryRows.reduce((acc, row) => {
      if (row.key) {
        acc[row.key] = row.value;
      }
      return acc;
    }, {} as Record<string, string>);

    return Object.keys(nextDictionary).length > 0 ? nextDictionary : undefined;
  };

  const [values, setValues] = useState(createValues(value));
  const valuesRef = useRef(values);

  const intl = useIntl();

  // Keep the editor in sync if the tracked-properties value is refreshed from the parent.
  useEffect(() => {
    const nextValues = createValues(value);
    if (!equals(nextValues, valuesRef.current)) {
      setValues(nextValues);
    }
  }, [value]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    const nextDictionary = valuesToDictionary(values);
    if (!equals(nextDictionary, value)) {
      onChange?.(nextDictionary);
    }
  }, [onChange, value, values]);

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
  const styles = useStyles();

  const indexItem = intl.formatMessage({
    defaultMessage: 'item',
    id: 'NFgfP4',
    description: 'Label for users to know which item they are on in the dictionary',
  });

  return (
    <>
      {customLabel ? customLabel : null}
      <div id={dictionaryFieldID} className={styles.container}>
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
