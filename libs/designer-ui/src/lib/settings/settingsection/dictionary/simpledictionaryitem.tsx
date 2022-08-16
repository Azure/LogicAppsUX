import type { EventHandler } from '../../../eventhandler';
import { IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { useIntl } from 'react-intl';

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
  onChange?: EventHandler<SimpleDictionaryChangeModel>;
  onDelete?: EventHandler<SimpleDictionaryRowModel>;
}

const deleteButtonIconProps: IIconProps = {
  iconName: 'Cancel',
};

export const SimpleDictionaryItem: React.FC<SimpleDictionaryItemProps> = ({
  disabled,
  allowDeletion,
  item,
  readOnly,
  onChange,
  onDelete,
}): JSX.Element => {
  const intl = useIntl();

  const dictionaryItemDelete = intl.formatMessage({
    defaultMessage: 'Click to delete item',
    description: 'Label for delete button',
  });

  const itemKeyAriaLabel = intl.formatMessage({
    defaultMessage: 'Key',
    description: 'Accessibility Label for dictionary text key field',
  });
  const dictionaryItemKeyPlaceholder = intl.formatMessage({
    defaultMessage: 'Key',
    description: 'A placeholder for the dictionary key',
  });
  const itemValueAriaLabel = intl.formatMessage({
    // defaultMessage: `${format(unformattedItemValueAriaLabel, itemIndex)}`,
    defaultMessage: 'Value',
    description: 'Accessibility Label for the dictionary text value field',
  });
  const dictionaryItemValuePlaceholder = intl.formatMessage({
    defaultMessage: 'Value',
    description: 'A placeholder for the dictionary value field',
  });

  const renderDelete = (): JSX.Element | null => {
    const deleteButtonClass = 'msla-button msla-dictionary-item-delete';

    return (
      <TooltipHost content={dictionaryItemDelete}>
        <IconButton
          aria-label={dictionaryItemDelete}
          className={deleteButtonClass}
          iconProps={deleteButtonIconProps}
          onClick={handleDeleteItem}
        />
      </TooltipHost>
    );
  };

  const handleKeyChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    if (onChange) {
      onChange({
        value: item.value,
        index: item.index,
        key: newValue ?? '',
      });
    }
  };

  const handleValueChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    if (onChange) {
      onChange({
        index: item.index,
        key: item.key,
        value: newValue ?? '',
      });
    }
  };

  const handleDeleteItem = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();

    if (onDelete) {
      onDelete(item);
    }
  };

  console.log(item.index);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '45% 45% 10%' }}>
      <div style={{ padding: '5px' }}>
        <TextField
          ariaLabel={itemKeyAriaLabel}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          value={item.key}
          onChange={handleKeyChange}
          placeholder={dictionaryItemKeyPlaceholder}
        />
      </div>
      <div style={{ padding: '5px' }}>
        <TextField
          ariaLabel={itemValueAriaLabel}
          disabled={disabled}
          readOnly={readOnly}
          value={item.value}
          onChange={handleValueChange}
          placeholder={dictionaryItemValuePlaceholder}
        />
      </div>
      {allowDeletion && !disabled ? renderDelete() : null}
    </div>
  );
};
