import type { EventHandler } from '../../../eventhandler';
import { Button, Input, Tooltip } from '@fluentui/react-components';
import { Dismiss12Regular } from '@fluentui/react-icons';
import type * as React from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './simpledictionaryitem.styles';

export interface SimpleDictionaryRowModel {
  key: string;
  value: string;
  index: number;
}

export interface SimpleDictionaryChangeModel {
  index: number;
  key: string;
  value: string;
}
export interface SimpleDictionaryItemProps {
  disabled?: boolean;
  allowDeletion?: boolean;
  item: SimpleDictionaryRowModel;
  readOnly?: boolean;
  ariaLabel?: string;
  onChange?: EventHandler<SimpleDictionaryChangeModel>;
  onDelete?: EventHandler<SimpleDictionaryRowModel>;
}

export const SimpleDictionaryItem: React.FC<SimpleDictionaryItemProps> = ({
  disabled,
  allowDeletion,
  item,
  readOnly,
  onChange,
  onDelete,
  ariaLabel,
}): JSX.Element => {
  const intl = useIntl();
  const styles = useStyles();

  const dictionaryItemDelete = intl.formatMessage({
    defaultMessage: 'Select to delete item',
    id: 'jfQPGz',
    description: 'Label for delete button',
  });

  const itemKeyAriaLabel = intl.formatMessage(
    {
      defaultMessage: '{name} Key',
      id: 'Q8zxeb',
      description: 'Accessibility Label for dictionary text key field',
    },
    {
      name: ariaLabel,
    }
  );
  const dictionaryItemKeyPlaceholder = intl.formatMessage({
    defaultMessage: 'Key',
    id: 'BBD8Em',
    description: 'A placeholder for the dictionary key',
  });
  const itemValueAriaLabel = intl.formatMessage(
    {
      // defaultMessage: `${format(unformattedItemValueAriaLabel, itemIndex)}`,
      defaultMessage: '{name} Value',
      id: 'mvu5xN',
      description: 'Accessibility Label for the dictionary text value field',
    },
    {
      name: ariaLabel,
    }
  );
  const dictionaryItemValuePlaceholder = intl.formatMessage({
    defaultMessage: 'Value',
    id: 'b9/1dK',
    description: 'A placeholder for the dictionary value field',
  });

  const renderDelete = (): JSX.Element | null => {
    return (
      <Tooltip content={dictionaryItemDelete} relationship="label">
        <Button
          aria-label={dictionaryItemDelete}
          className={styles.deleteButton}
          icon={<Dismiss12Regular />}
          appearance="subtle"
          size="small"
          onClick={handleDeleteItem}
        />
      </Tooltip>
    );
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (onChange) {
      onChange({
        value: item.value,
        index: item.index,
        key: e.target.value ?? '',
      });
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (onChange) {
      onChange({
        index: item.index,
        key: item.key,
        value: e.target.value ?? '',
      });
    }
  };

  const handleDeleteItem = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();

    if (onDelete) {
      onDelete(item);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.fieldWrapper}>
        <Input
          aria-label={itemKeyAriaLabel}
          disabled={disabled || readOnly}
          value={item.key}
          onChange={handleKeyChange}
          placeholder={dictionaryItemKeyPlaceholder}
          style={{ width: '100%' }}
        />
      </div>
      <div className={styles.fieldWrapper}>
        <Input
          aria-label={itemValueAriaLabel}
          disabled={disabled || readOnly}
          value={item.value}
          onChange={handleValueChange}
          placeholder={dictionaryItemValuePlaceholder}
          style={{ width: '100%' }}
        />
      </div>
      <div>{allowDeletion && !disabled ? renderDelete() : null}</div>
    </div>
  );
};
