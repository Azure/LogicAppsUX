import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { FontSizes, Dropdown } from '@fluentui/react';
import { useIntl } from 'react-intl';

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
    marginBottom: '30px',
    height: '28px',
  },
};

interface AuthenticationDropdownProps {
  errorMessage: string;
  selectedManagedIdentityKey: string;
  options: IDropdownOption[];
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void;
}

export const AuthenticationDropdown = ({
  errorMessage,
  selectedManagedIdentityKey,
  options,
  onManagedIdentityChange,
}: AuthenticationDropdownProps) => {
  const intl = useIntl();
  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'Please select an identity',
    description: 'Placehodler text for dropdown',
  });
  return (
    <div className="msla-authentication-property">
      <div className="msla-authentication-text-editor-label">
        <Label isRequiredField={AUTHENTICATION_PROPERTIES.MSI_IDENTITY.isRequired} text={MSIAuthLabel} />
      </div>
      <div className="msla-input-sub-parameter-content">
        <Dropdown
          selectedKey={selectedManagedIdentityKey}
          placeholder={MSIAuthPlaceholder}
          ariaLabel={MSIAuthLabel}
          onChange={onManagedIdentityChange}
          options={options}
          styles={dropdownStyle}
          className="msla-authentication-dropdown"
          errorMessage={errorMessage ?? undefined}
        />
      </div>
    </div>
  );
};
