import { Dropdown, Label, Option, OptionGroup, Spinner, makeStyles, useId } from '@fluentui/react-components';
import type { DropdownProps, OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';

// Legacy v8 compatibility types
export const DropdownMenuItemType = {
  Normal: 0,
  Divider: 1,
  Header: 2,
} as const;

export type DropdownMenuItemType = (typeof DropdownMenuItemType)[keyof typeof DropdownMenuItemType];

export interface IDropdownOption {
  key: string | number;
  text: string;
  disabled?: boolean;
  hidden?: boolean;
  itemType?: DropdownMenuItemType;
  data?: any;
}

export interface ISearchableDropdownProps extends Omit<DropdownProps, 'onOptionSelect' | 'onChange' | 'children'> {
  options: IDropdownOption[];
  selectedKey?: string | number;
  selectedKeys?: (string | number)[];
  multiSelect?: boolean;
  onChanged?: (option: IDropdownOption, index?: number) => void;
  onChange?: (event: any, option: IDropdownOption) => void; // For v8 compatibility
  onSelectionChanged?: (event: SelectionEvents, data: OptionOnSelectData) => void;
  isLoading?: boolean;
  label?: string;
  calloutProps?: any; // For v8 compatibility
  onRenderOption?: (option: IDropdownOption) => JSX.Element; // For v8 compatibility
  onDismiss?: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    gap: '2px',
    maxWidth: '400px',
  },
  dropdown: {
    width: '100%',
  },
  spinner: {
    position: 'absolute',
    top: '50%',
    right: '40px',
    transform: 'translateY(-50%)',
    zIndex: 1000,
  },
});

export const SearchableDropdown: React.FC<ISearchableDropdownProps> = (props) => {
  const {
    options = [],
    selectedKey,
    selectedKeys,
    multiSelect,
    onChanged,
    onChange,
    onSelectionChanged,
    isLoading,
    label,
    onDismiss,
    ...dropdownProps
  } = props;

  const styles = useStyles();
  const dropdownId = useId(`dropdown-${label}`);

  const handleOptionSelect = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selectedOption = options.find((opt) => String(opt.key) === String(data.optionValue));

    if (selectedOption) {
      // Call legacy onChanged handler
      if (onChanged) {
        const index = options.findIndex((opt) => opt.key === selectedOption.key);
        onChanged(selectedOption, index);
      }

      // Call legacy onChange handler (v8 compatibility)
      if (onChange) {
        onChange(event, selectedOption);
      }

      // Call new v9 handler
      if (onSelectionChanged) {
        onSelectionChanged(event, data);
      }
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  const getSelectedValue = () => {
    if (multiSelect && selectedKeys) {
      const selectedOptions = options.filter((opt) => selectedKeys.includes(opt.key));
      return selectedOptions.map((opt) => opt.text).join(', ');
    }

    if (selectedKey) {
      const selectedOption = options.find((opt) => opt.key === selectedKey);
      return selectedOption?.text || '';
    }

    return '';
  };

  const renderDropdownContent = () => {
    const groups: { [key: string]: IDropdownOption[] } = {};
    let currentGroup = 'default';

    // Group options by headers
    options.forEach((option) => {
      if (option.itemType === DropdownMenuItemType.Header) {
        currentGroup = String(option.key);
        groups[currentGroup] = [];
      } else if (option.itemType === DropdownMenuItemType.Divider) {
        // Skip dividers in v9 (handled by OptionGroup)
      } else {
        if (!groups[currentGroup]) {
          groups[currentGroup] = [];
        }
        groups[currentGroup].push(option);
      }
    });

    const hasGroups = Object.keys(groups).length > 1 || Object.keys(groups)[0] !== 'default';

    if (hasGroups) {
      return Object.entries(groups).map(([groupKey, groupOptions]) => {
        if (groupOptions.length === 0) {
          return null;
        }

        const headerOption = options.find((opt) => opt.itemType === DropdownMenuItemType.Header && String(opt.key) === groupKey);

        return (
          <OptionGroup key={groupKey} label={headerOption?.text || groupKey}>
            {groupOptions.map((option) => {
              return (
                <Option key={String(option.key)} value={String(option.key)} disabled={option.disabled}>
                  {option.text}
                </Option>
              );
            })}
          </OptionGroup>
        );
      });
    }

    // No groups, render options directly
    return options
      .filter((opt) => opt.itemType !== DropdownMenuItemType.Header && opt.itemType !== DropdownMenuItemType.Divider)
      .map((option) => {
        return (
          <Option key={String(option.key)} value={String(option.key)} disabled={option.disabled}>
            {option.text}
          </Option>
        );
      });
  };

  return (
    <div className={styles.root}>
      <Label htmlFor={dropdownId}>{label}</Label>
      <Dropdown
        id={dropdownId}
        {...dropdownProps}
        className={styles.dropdown}
        multiselect={multiSelect}
        value={getSelectedValue()}
        selectedOptions={multiSelect && selectedKeys ? selectedKeys.map(String) : selectedKey ? [String(selectedKey)] : []}
        onOptionSelect={handleOptionSelect}
        aria-label={label}
      >
        {renderDropdownContent()}
      </Dropdown>
      {isLoading && <Spinner className={styles.spinner} size="extra-small" />}
    </div>
  );
};
