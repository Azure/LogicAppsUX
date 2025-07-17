import { SearchableDropdown } from '../searchabledropdown';
import type { SearchableDropdownProps } from '../searchabledropdown';
import { Button, Tooltip, Label } from '@fluentui/react-components';
import { useState, type FC } from 'react';
import { useSearchableDropdownWithAddAllStyles } from './searchabledropdownWithAddAll.styles';

export interface SearchableDropdownWithAddAllProps extends SearchableDropdownProps {
  addAllButtonText?: string;
  addAllButtonTooltip?: string;
  addAllButtonEnabled?: boolean;
  removeAllButtonText?: string;
  removeAllButtonTooltip?: string;
  removeAllButtonEnabled?: boolean;
  label?: string;
  onShowAllClick?: () => void;
  onHideAllClick?: () => void;
}

export const SearchableDropdownWithAddAll: FC<SearchableDropdownWithAddAllProps> = ({
  addAllButtonTooltip,
  addAllButtonText,
  addAllButtonEnabled,
  removeAllButtonTooltip,
  removeAllButtonText,
  removeAllButtonEnabled,
  label,
  onShowAllClick,
  onHideAllClick,
  ...searchableDropdownProps
}): JSX.Element => {
  const styles = useSearchableDropdownWithAddAllStyles();
  const handleShowAll = () => onShowAllClick?.();
  const handleRemoveAll = () => {
    setSelectedKeys([]);
    onHideAllClick?.();
  };
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const renderButton = (handler: () => void, text?: string, tooltip?: string, enabled?: boolean, dataAutomationId?: string) => {
    if (!text) {
      return null;
    }

    const buttonElement = (
      <Button
        size="small"
        appearance="outline"
        onClick={handler}
        disabled={!enabled} // Fixed: inverted the logic
        data-automation-id={dataAutomationId}
      >
        {text}
      </Button>
    );

    return tooltip ? (
      <Tooltip content={tooltip} relationship="label" withArrow>
        {buttonElement}
      </Tooltip>
    ) : (
      buttonElement
    );
  };

  const labelId = label ? `dropdown-label-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  return (
    <div className={styles.container}>
      {label && (
        <Label id={labelId} className={styles.searchableDropdownLabel}>
          {label}
        </Label>
      )}
      <div className={styles.dropdownWithButtons}>
        <SearchableDropdown
          {...searchableDropdownProps}
          labelId={labelId}
          className={styles.searchableDropdownWithButtons}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
        />
        <div className={styles.buttonGroup}>
          {renderButton(handleShowAll, addAllButtonText, addAllButtonTooltip, addAllButtonEnabled ?? true, 'msla-add-all-button')}
          {renderButton(
            handleRemoveAll,
            removeAllButtonText,
            removeAllButtonTooltip,
            removeAllButtonEnabled ?? true,
            'msla-remove-all-button'
          )}
        </div>
      </div>
    </div>
  );
};
