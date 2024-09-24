import { Dropdown, type IDropdownOption } from '@fluentui/react';
import { getIdentityDropdownOptions, type ManagedIdentity } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface LegacyManagedIdentityDropdownProps {
  identity?: ManagedIdentity;
  onChange: (event: any, item?: IDropdownOption<any>) => void;
  disabled?: boolean;
}

const LegacyManagedIdentityDropdown = (props: LegacyManagedIdentityDropdownProps) => {
  const { identity, onChange, disabled } = props;
  const intl = useIntl();
  const dropdownOptions = useMemo(() => getIdentityDropdownOptions(identity, intl), [identity, intl]);

  const noIdentitiesAvailable = useMemo(() => dropdownOptions.length === 0, [dropdownOptions]);
  const noIdentityText = intl.formatMessage({
    defaultMessage: 'No identities available',
    id: 'U1A0i4',
    description: 'Dropdown option for no identity',
  });

  return (
    <Dropdown
      className={'connection-parameter-input'}
      onChange={onChange}
      placeholder={noIdentitiesAvailable ? noIdentityText : undefined}
      disabled={disabled || noIdentitiesAvailable}
      options={dropdownOptions}
      defaultSelectedKey={dropdownOptions[0]?.key}
    />
  );
};

export default LegacyManagedIdentityDropdown;
