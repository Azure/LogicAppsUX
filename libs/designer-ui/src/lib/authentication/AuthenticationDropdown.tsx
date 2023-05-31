import { AUTHENTICATION_PROPERTIES } from './util';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { css, Label, FontSizes, Dropdown } from '@fluentui/react';

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
    height: '28px',
  },
};

interface AuthenticationDropdownProps {
  readonly?: boolean;
  errorMessage?: string;
  selectedKey: string;
  dropdownPlaceholder?: string;
  dropdownLabel?: string;
  options: IDropdownOption[];
  onChange(event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void;
}

export const AuthenticationDropdown = ({
  readonly,
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
        <div className="msla-input-parameter-label">
          <Label className={'msla-label'} required={AUTHENTICATION_PROPERTIES.MSI_IDENTITY.isRequired}>
            {dropdownLabel}
          </Label>
        </div>
      ) : null}

      <Dropdown
        disabled={readonly}
        styles={dropdownStyle}
        selectedKey={selectedKey}
        placeholder={dropdownPlaceholder}
        ariaLabel={dropdownLabel}
        options={options}
        className={css('msla-authentication-dropdown', errorMessage && 'has-error')}
        errorMessage={errorMessage}
        onChange={onChange}
      />
    </div>
  );
};
