import { Dropdown, type IDropdownOption } from '@fluentui/react';
import { ResourceIdentityType, equals, type ManagedIdentity } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';

interface LegacyManagedIdentityDropdownProps {
  identity?: ManagedIdentity;
  onChange: (event: any, item?: IDropdownOption<any>) => void;
  disabled?: boolean;
}

const LegacyManagedIdentityDropdown = (props: LegacyManagedIdentityDropdownProps) => {
  const { identity, onChange, disabled } = props;
  const intl = useIntl();
  const dropdownOptions = useMemo(() => getDropdownOptions(identity, intl), [identity, intl]);

  // Set value to first option on start
  useEffect(() => onChange(undefined, dropdownOptions[0]), [dropdownOptions, onChange]);

  return (
    <Dropdown
      className={'connection-parameter-input'}
      onChange={onChange}
      disabled={disabled}
      options={dropdownOptions}
      defaultSelectedKey={dropdownOptions[0]?.key}
    />
  );
};

const getDropdownOptions = (managedIdentity: ManagedIdentity | undefined, intl: IntlShape): IDropdownOption[] => {
  const options: IDropdownOption[] = [];
  if (!managedIdentity) return options;
  const { type, userAssignedIdentities } = managedIdentity;
  const systemAssigned = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'Text for system assigned managed identity',
  });

  if (equals(type, ResourceIdentityType.SYSTEM_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    options.push({ key: 'System-assigned managed identity', text: systemAssigned });
  }

  if (equals(type, ResourceIdentityType.USER_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    for (const identity of Object.keys(userAssignedIdentities ?? {})) {
      options.push({ key: identity, text: identity.split('/').at(-1) ?? identity });
    }
  }

  return options;
};

export default LegacyManagedIdentityDropdown;
