import type { SettingProps } from './';
import { Dropdown, Option, type DropdownProps } from '@fluentui/react-components';
import { useStyles } from './settingdropdown.styles';

export interface SelectionChangedEvent {
  currentTarget: any;
  value: string;
}

// Backward compatibility interface similar to v8 IDropdownOption
export interface IDropdownOption {
  key: string;
  text: string;
  disabled?: boolean;
}

export type DropdownSelectionChangeHandler = (option: IDropdownOption) => void;

export interface DropdownItem {
  title: string;
  value: string;
  disabled?: boolean;
  /**
   * Data available to custom onRender function to define role
   */
  type?: 'option' | 'link';
  icon?: DropdownIcon;
  id?: string;
}

export interface DropdownIcon {
  source: string;
  ariaLabel: string;
  ariaHidden: boolean;
}

export interface SettingDropdownProps extends SettingProps {
  id?: string;
  items: DropdownItem[];
  label?: string;
  selectedValue?: string;
  onSelectionChanged?: DropdownSelectionChangeHandler;
}

export const SettingDropdown = ({
  id,
  readOnly,
  items,
  selectedValue,
  onSelectionChanged,
  customLabel,
  ariaLabel,
}: SettingDropdownProps): JSX.Element | null => {
  const styles = useStyles();

  const handleSelectionChange: DropdownProps['onOptionSelect'] = (_, data) => {
    const selectedItem = items.find((item) => item.value === data.optionValue);
    if (selectedItem && onSelectionChanged) {
      // Convert to v8-compatible format for backward compatibility
      onSelectionChanged({
        key: selectedItem.value,
        text: selectedItem.title,
        disabled: selectedItem.disabled,
      });
    }
  };

  const selectedOption = items.find((item) => item.value === selectedValue);

  return (
    <div className={styles.root}>
      {customLabel ? customLabel : null}
      <Dropdown
        className={styles.dropdown}
        id={id}
        aria-label={ariaLabel}
        disabled={readOnly}
        value={selectedOption?.title || ''}
        selectedOptions={selectedValue ? [selectedValue] : []}
        onOptionSelect={handleSelectionChange}
      >
        {items.map((item) => (
          <Option key={item.value} value={item.value} disabled={item.disabled}>
            {item.title}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
};
