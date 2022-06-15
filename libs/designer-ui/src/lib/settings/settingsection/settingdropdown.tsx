import type { SettingProps } from './settingtoggle';
import { Dropdown } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';

export interface SelectionChangedEvent {
  currentTarget: any; // tslint:disable-line: no-any
  value: string;
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
}: SettingDropdownProps): JSX.Element | null => {
  const mapDropdownItemsToIDropdownOptions = (items: DropdownItem[]): IDropdownOption[] => {
    return items.map(({ disabled, title: text, value: key }: DropdownItem) => ({
      disabled,
      key,
      text,
    }));
  };
  return (
    <>
      {customLabel ? customLabel() : null}
      <Dropdown
        className="msla-setting-section-dropdown"
        id={id}
        disabled={readOnly}
        options={mapDropdownItemsToIDropdownOptions(items)}
        selectedKey={selectedValue}
        onChange={(_, option) => onSelectionChanged?.(option as IDropdownOption)}
      />
    </>
  );
};
