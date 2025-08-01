import { Dropdown, Label, Option, OptionGroup, Spinner, makeStyles, useId } from '@fluentui/react-components';
import type { DropdownProps, OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';

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
  selected?: boolean;
}

export interface ISearchableDropdownProps extends Omit<DropdownProps, 'onOptionSelect' | 'onChange' | 'children'> {
  options: IDropdownOption[];
  onChange: (event: any, option: IDropdownOption) => void;
  label: string;
  selectedKey?: string | number;
  selectedKeys?: (string | number)[];
  multiSelect?: boolean;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateRows: 'repeat(1fr)',
    justifyItems: 'start',
    gap: '2px',
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
  const { options = [], onChange, label, selectedKey, selectedKeys, placeholder, multiSelect, isLoading, className } = props;
  const styles = useStyles();
  const dropdownId = useId(`dropdown-${label}`);

  const handleOptionSelect = (event: SelectionEvents, data: OptionOnSelectData) => {
    const selectedOption = options.find((opt) => String(opt.key) === String(data.optionValue));

    if (selectedOption) {
      onChange(event, selectedOption);
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

    options.forEach((option) => {
      if (option.itemType === DropdownMenuItemType.Header) {
        currentGroup = String(option.key);
        groups[currentGroup] = [];
      } else if (option.itemType === DropdownMenuItemType.Divider) {
        // Skip dividers - they don't get added to any group
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
    <div className={`${styles.root} ${className || ''}`}>
      <Label htmlFor={dropdownId}>{label}</Label>
      <Dropdown
        placeholder={placeholder}
        id={dropdownId}
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
