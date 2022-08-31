import type { MSIProps } from '..';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES, containsUserAssignedIdentities } from '../util';
import { MSIAuthenticationDefault } from './MSIAuthDefault';
import type { IDropdownOption } from '@fluentui/react';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { ResourceIdentityType, equals } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface MSIAuthenticationProps {
  msiProps: MSIProps;
  identity?: ManagedIdentity;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
}

export const MSIAuthentication = ({ identity, msiProps, GetTokenPicker, onManagedIdentityChange }: MSIAuthenticationProps): JSX.Element => {
  const intl = useIntl();
  const [errorMessage, setErrorMessage] = useState('');
  const [managedIdentityDropdownOptions, setManagedIdentityDropdownOptions] = useState<IDropdownOption[]>([]);

  const invalidUserAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'The entered identity is not associated with this Logic App.',
    description: 'error message for invalid user',
  });
  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'Text for dropdown of system-assigned managed identity',
  });
  const userIdentityNotSupported = intl.formatMessage({
    defaultMessage: 'User identity is not supported when Logic App has system assigned managed identity enabled.',
    description: 'error message for unspported identity',
  });

  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'Please select an identity',
    description: 'Placehodler text for dropdown',
  });

  const selectedManagedIdentityKey = msiProps.MSIIdentity;
  const { MSIAudience } = msiProps;

  if (identity?.type) {
    const userAssignedIdentities = containsUserAssignedIdentities(identity) ? getUserAssignedIdentities(identity) : undefined;
    if (
      equals(identity.type, ResourceIdentityType.USER_ASSIGNED) ||
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
    ) {
      if (userAssignedIdentities) {
        setManagedIdentityDropdownOptions(userAssignedIdentities);
      }
      if (selectedManagedIdentityKey && userAssignedIdentities?.find((userIdentity) => userIdentity.key === selectedManagedIdentityKey)) {
        setManagedIdentityDropdownOptions([
          ...managedIdentityDropdownOptions,
          { key: selectedManagedIdentityKey, text: getIdentityDisplayName(selectedManagedIdentityKey) },
        ]);
        setErrorMessage(invalidUserAssignedManagedIdentity);
      }
    }
    if (
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
    ) {
      setManagedIdentityDropdownOptions([
        ...managedIdentityDropdownOptions,
        {
          key: ResourceIdentityType.SYSTEM_ASSIGNED,
          text: systemAssignedManagedIdentity,
        },
      ]);
      if (selectedManagedIdentityKey && equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED)) {
        setManagedIdentityDropdownOptions([
          ...managedIdentityDropdownOptions,
          {
            key: selectedManagedIdentityKey,
            text: getIdentityDisplayName(selectedManagedIdentityKey),
          },
        ]);
        setErrorMessage(userIdentityNotSupported);
      }
    }
  }

  return (
    <div className="msla-authentication-editor-MSI-container">
      {identity?.type ? (
        <>
          <AuthenticationDropdown
            dropdownLabel={MSIAuthLabel}
            dropdownPlaceholder={MSIAuthPlaceholder}
            errorMessage={errorMessage}
            selectedKey={selectedManagedIdentityKey ?? ResourceIdentityType.SYSTEM_ASSIGNED}
            options={managedIdentityDropdownOptions}
            onChange={onManagedIdentityChange}
          />
          <AuthenticationProperty
            initialValue={MSIAudience}
            AuthProperty={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE}
            GetTokenPicker={GetTokenPicker}
          />
        </>
      ) : (
        <MSIAuthenticationDefault msiProps={msiProps} GetTokenPicker={GetTokenPicker} onManagedIdentityChange={onManagedIdentityChange} />
      )}
    </div>
  );
};

function getUserAssignedIdentities(identity: ManagedIdentity): IDropdownOption[] {
  const options: IDropdownOption[] = [];
  if (identity.userAssignedIdentities) {
    for (const userAssignedIdentity of Object.keys(identity.userAssignedIdentities)) {
      options.push({
        key: userAssignedIdentity,
        text: getIdentityDisplayName(userAssignedIdentity),
      });
    }
  }
  return options;
}

function getIdentityDisplayName(msiIdentity: string): string {
  return msiIdentity.split('/').slice(-1)[0];
}
