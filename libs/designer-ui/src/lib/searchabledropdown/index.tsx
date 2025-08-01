import { Combobox, Option, Text, mergeClasses } from '@fluentui/react-components';
import type { FC, ChangeEvent } from 'react';
import { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSearchableDropdownStyles } from './searchabledropdown.styles';

export const SEARCHABLE_DROPDOWN_SELECT_ALL_KEY = 'SELECT_ALL_KEY';

export interface SearchableDropdownOption {
  key: string;
  text: string;
  data?: any;
}

export interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  onItemSelectionChanged: (id: string, isSelected: boolean) => void;
  onDismiss?: () => void;
  labelId?: string;
  searchPlaceholderText?: string;
  showSearchItemThreshold?: number;
  className?: string;
  placeholder?: string;
  multiselect?: boolean;
  disabled?: boolean;

  /** Optional: controlled selected keys */
  selectedKeys?: string[];
  /** Optional: called when internal selection changes */
  onSelectedKeysChange?: (newKeys: string[]) => void;
  /** Optional: show "Select All" option when there are multiple options */
  showSelectAll?: boolean;
}

export const SearchableDropdown: FC<SearchableDropdownProps> = ({
  options: inputOptions,
  onItemSelectionChanged,
  onDismiss,
  searchPlaceholderText,
  showSearchItemThreshold = 4,
  className,
  labelId,
  placeholder,
  multiselect = true,
  disabled = false,
  selectedKeys: controlledSelectedKeys,
  onSelectedKeysChange,
  showSelectAll = false,
}) => {
  const styles = useSearchableDropdownStyles();
  const intl = useIntl();

  const [uncontrolledSelectedKeys, setUncontrolledSelectedKeys] = useState<string[]>([]);
  const selectedKeys = controlledSelectedKeys ?? uncontrolledSelectedKeys;

  const updateSelectedKeys = (newKeys: string[]) => {
    if (controlledSelectedKeys === undefined) {
      setUncontrolledSelectedKeys(newKeys);
    }
    onSelectedKeysChange?.(newKeys);
  };

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const searchPlaceholder =
    searchPlaceholderText ??
    intl.formatMessage({
      defaultMessage: 'Search',
      id: 'Fcvgvg',
      description: 'Default placeholder for search box that searches dropdown options',
    });

  const noResultsText = intl.formatMessage({
    defaultMessage: 'No results found',
    id: '+R82zZ',
    description: 'Text displayed when no options match the search query',
  });

  const selectAllText = intl.formatMessage({
    defaultMessage: 'Select all',
    id: 'xgV4pp',
    description: 'Text for the "Select All" option in a multiselect dropdown',
  });

  const deselectAllText = intl.formatMessage({
    defaultMessage: 'Deselect all',
    id: 'v6V2NA',
    description: 'Text for the "Deselect All" option in a multiselect dropdown',
  });

  const showSearchBox = inputOptions.length >= showSearchItemThreshold;

  // Create options with optional "Select All" at the top
  const optionsWithSelectAll = useMemo(() => {
    const regularOptions = inputOptions.filter((option) => option.text.toLowerCase().includes(inputValue.toLowerCase()));

    if (!showSelectAll || !multiselect || regularOptions.length <= 1) {
      return regularOptions;
    }

    // Determine Select All state and text
    const selectableKeys = regularOptions.map((option) => option.key);
    const allSelected = selectableKeys.length > 0 && selectableKeys.every((key) => selectedKeys.includes(key));
    const selectOptionText = allSelected ? deselectAllText : selectAllText;

    const selectAllOption: SearchableDropdownOption = {
      key: SEARCHABLE_DROPDOWN_SELECT_ALL_KEY,
      text: selectOptionText,
      data: { isSelectAll: true, allSelected },
    };

    return [selectAllOption, ...regularOptions];
  }, [inputOptions, showSelectAll, multiselect, deselectAllText, selectAllText, inputValue, selectedKeys]);

  const handleOpenChange = (_e: any, data: { open: boolean }) => {
    setIsOpen(data.open);
    if (!data.open) {
      selectedKeys.forEach((key) => onItemSelectionChanged(key, true));
      setInputValue('');
      onDismiss?.();
    }
  };

  const handleOptionSelect = (_e: any, data: { optionValue?: string }) => {
    const key = data.optionValue;
    if (!key) {
      return;
    }

    // Handle "Select All"/"Deselect All" functionality
    if (key === SEARCHABLE_DROPDOWN_SELECT_ALL_KEY && multiselect) {
      const allSelectableKeys = optionsWithSelectAll
        .filter((option) => option.key !== SEARCHABLE_DROPDOWN_SELECT_ALL_KEY)
        .map((option) => option.key);

      const allSelected = allSelectableKeys.length > 0 && allSelectableKeys.every((optionKey) => selectedKeys.includes(optionKey));

      if (allSelected) {
        updateSelectedKeys([]);
      } else {
        updateSelectedKeys(allSelectableKeys);
      }
      return;
    }

    if (multiselect) {
      const newKeys = selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key];
      updateSelectedKeys(newKeys);
    } else {
      updateSelectedKeys([key]);
      onItemSelectionChanged(key, true);
      setIsOpen(false);
      onDismiss?.();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <Combobox
      aria-labelledby={labelId}
      multiselect={multiselect}
      disabled={disabled}
      open={isOpen}
      placeholder={showSearchBox ? searchPlaceholder : placeholder}
      className={mergeClasses(styles.root, className)}
      onOpenChange={handleOpenChange}
      onOptionSelect={handleOptionSelect}
      value={inputValue}
      onChange={handleInputChange}
      {...(multiselect ? { selectedOptions: selectedKeys } : { value: selectedKeys[0] || '' })}
    >
      {optionsWithSelectAll.map((option) => (
        <Option key={option.key} value={option.key}>
          {option.text}
        </Option>
      ))}

      {optionsWithSelectAll.length === 0 && inputValue && (
        <div className={styles.noResults}>
          <Text size={200}>{noResultsText}</Text>
        </div>
      )}
    </Combobox>
  );
};
