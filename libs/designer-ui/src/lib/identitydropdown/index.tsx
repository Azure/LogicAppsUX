import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { Dropdown, FontSizes, Label } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface IdentityDropdownProps {
  defaultSelectedKey?: string;
  dropdownOptions: IDropdownOption[];
  handleChange(event: React.FormEvent<HTMLDivElement>, option: IDropdownOption): void;
  readOnly: boolean;
}

export const dropdownStyles: Pick<IDropdownStyles, 'caretDown' | 'caretDownWrapper' | 'dropdownOptionText' | 'title'> = {
  caretDownWrapper: {
    lineHeight: 26,
    right: 8,
  },
  caretDown: {
    fontSize: FontSizes.small,
  },
  dropdownOptionText: {
    fontSize: FontSizes.small,
  },
  title: {
    border: 'none',
    fontSize: FontSizes.small,
    lineHeight: 26,
  },
};

export const IdentityDropdown: React.FC<IdentityDropdownProps> = ({ defaultSelectedKey, dropdownOptions, readOnly, handleChange }) => {
  const intl = useIntl();
  const managedIdentityLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'A Label for a Dropdown',
  });
  const managedIdentityPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a managed identity',
    description: 'A placeholder for the managed identity dropdown',
  });

  return (
    <div className="msla-identity-dropdown-container">
      <Label className="msla-identity-dropdown-label">{managedIdentityLabel}</Label>
      <Dropdown
        ariaLabel={managedIdentityLabel}
        disabled={readOnly}
        options={dropdownOptions}
        defaultSelectedKey={defaultSelectedKey}
        placeholder={managedIdentityPlaceholder}
        styles={dropdownStyles}
        onChange={handleChange as any}
      />
    </div>
  );
};
