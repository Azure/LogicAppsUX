import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { FontSizes, Dropdown } from '@fluentui/react';

const dropdownStyle: Partial<IDropdownStyles> = {
  caretDown: {
    fontSize: FontSizes.icon,
    lineHeight: '24px',
    right: '10px',
  },
  dropdownOptionText: {
    fontSize: FontSizes.medium,
  },
  title: {
    border: '1px solid #989898',
    fontSize: FontSizes.medium,
    height: '28px',
    lineHeight: '26px',
  },
  root: {
    marginBottom: '20px',
    height: '28px',
  },
};

interface AuthenticationDropdownProps {
  errorMessage?: string;
  selectedKey: string;
  dropdownPlaceholder?: string;
  dropdownLabel?: string;
  options: IDropdownOption[];
  onChange(event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void;
}

export const AuthenticationDropdown = ({
  errorMessage,
  selectedKey,
  dropdownPlaceholder,
  dropdownLabel,
  options,
  onChange,
}: AuthenticationDropdownProps) => {
  return (
    <div className="msla-authentication-property">
      {dropdownLabel ? (
        <div className="msla-authentication-text-editor-label">
          <Label isRequiredField={AUTHENTICATION_PROPERTIES.MSI_IDENTITY.isRequired} text={dropdownLabel} />
        </div>
      ) : null}
      <div className="msla-input-sub-parameter-content">
        <Dropdown
          styles={dropdownStyle}
          selectedKey={selectedKey}
          placeholder={dropdownPlaceholder}
          ariaLabel={dropdownLabel}
          options={options}
          className="msla-authentication-dropdown"
          errorMessage={errorMessage}
          onChange={onChange}
        />
      </div>
    </div>
  );
};
