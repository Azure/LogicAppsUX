import type { MSIProps } from '..';
import { StringEditor } from '../../editor/string';
import { Label } from '../../label';
import { AuthenticationDropdown } from '../AuthDropdown';
import { AUTHENTICATION_PROPERTIES, containsUserAssignedIdentities } from '../util';
import { MSIAuthenticationDefault } from './MSIAuthDefault';
import type { IDropdownOption } from '@fluentui/react';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { ResourceIdentityType, equals } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface MSIAuthenticationProps {
  MSIProps: MSIProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  identity?: ManagedIdentity;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
}

export const MSIAuthentication = ({ identity, MSIProps, GetTokenPicker, onManagedIdentityChange }: MSIAuthenticationProps): JSX.Element => {
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
  const selectedManagedIdentityKey = MSIProps.MSIIdentity;
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
            errorMessage={errorMessage}
            selectedManagedIdentityKey={selectedManagedIdentityKey ?? ResourceIdentityType.SYSTEM_ASSIGNED}
            options={managedIdentityDropdownOptions}
            onManagedIdentityChange={onManagedIdentityChange}
          />

          <div className="msla-authentication-editor-expanded-item">
            <Label
              className="msla-authentication-editor-expanded-item-label"
              text={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE.displayName}
              isRequiredField={true}
            />
            <div className="msla-authentication-editor-expanded-editor-container">
              <StringEditor
                initialValue={[]}
                GetTokenPicker={GetTokenPicker}
                placeholder={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE.placeHolder}
                BasePlugins={{ tokens: true }}
                singleLine={true}
                tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
              />
            </div>
          </div>
        </>
      ) : (
        <MSIAuthenticationDefault MSIProps={MSIProps} GetTokenPicker={GetTokenPicker} onManagedIdentityChange={onManagedIdentityChange} />
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
