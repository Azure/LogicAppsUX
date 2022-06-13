import type { EventHandler } from '../../../eventhandler';
import { IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { useIntl } from 'react-intl';

export interface SimpleDictionaryRowModel {
  id: string;
  key?: string;
  value?: string;
}

export interface SimpleDictionaryItemProps {
  disabled?: boolean;
  isLastItem?: boolean;
  item: SimpleDictionaryRowModel;
  itemIndex?: number;
  readOnly?: boolean;
  onChange?: EventHandler<SimpleDictionaryRowModel>;
  onDelete?: EventHandler<SimpleDictionaryRowModel>;
  // onFocus?: EventHandler<SimpleDictionaryRowModel>;
}

const deleteButtonIconProps: IIconProps = {
  iconName: 'Cancel',
};

export const SimpleDictionaryItem: React.FC<SimpleDictionaryItemProps> = ({
  disabled,
  isLastItem,
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
    // defaultMessage: `${format(unformattedItemKeyAriaLabel, itemIndex)}`,
    defaultMessage: 'test message',
    description: 'Accessibility Label for dictionary text key field',
  });
  const dictionaryItemKeyPlaceholder = intl.formatMessage({
    defaultMessage: 'Key',
    description: 'A placeholder for the dictionary key',
  });
  const itemValueAriaLabel = intl.formatMessage({
    // defaultMessage: `${format(unformattedItemValueAriaLabel, itemIndex)}`,
    defaultMessage: 'test message 2',
    description: 'Accessibility Label for the dictionary text value field',
  });
  const dictionaryItemValuePlaceholder = intl.formatMessage({
    defaultMessage: 'Value',
    description: 'A placeholder for the dictionary value field',
  });

  const className = disabled ? 'msla-dictionary-item msla-disabled' : 'msla-dictionary-item';
  const keyClassName = isLastItem
    ? 'msla-dictionary-item-cell msla-input-parameter-dictionary-key msla-dictionary-item-last'
    : 'msla-dictionary-item-cell msla-input-parameter-dictionary-key';

  const valueClassName = isLastItem
    ? 'msla-dictionary-item-cell msla-input-parameter-dictionary-value msla-dictionary-item-last'
    : 'msla-dictionary-item-cell msla-input-parameter-dictionary-value';

  const renderDelete = (): JSX.Element => {
    let deleteButtonClass = 'msla-button msla-dictionary-item-delete';

    if (isLastItem || disabled || readOnly) {
      deleteButtonClass += ' msla-hidden';
    }

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

  const handleKeyChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined): void => {
    if (onChange) {
      onChange({
        ...item,
        key: newValue,
      });
    }
  };

  const handleValueChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined): void => {
    if (onChange) {
      onChange({
        ...item,
        value: newValue,
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
    <div className={className}>
      <div className={keyClassName}>
        <TextField
          ariaLabel={itemKeyAriaLabel}
          className="msla-dictionary-item-textfield"
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          value={item.key}
          onChange={handleKeyChange}
          placeholder={dictionaryItemKeyPlaceholder}
        />
      </div>
      <div className={valueClassName}>
        <TextField
          ariaLabel={itemValueAriaLabel}
          className="msla-dictionary-item-textfield"
          disabled={disabled}
          readOnly={readOnly}
          value={item.value}
          onChange={handleValueChange}
          placeholder={dictionaryItemValuePlaceholder}
        />
      </div>
      {renderDelete()}
    </div>
  );
};
