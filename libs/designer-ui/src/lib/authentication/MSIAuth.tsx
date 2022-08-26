import type { MSIProps } from '.';
import { StringEditor } from '../editor/string';
import { Label } from '../label';
import { AuthenticationDropdown } from './AuthDropdown';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { IDropdownOption } from '@fluentui/react';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { ResourceIdentityType } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface MSIAuthenticationProps {
  MSIProps: MSIProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  identity?: ManagedIdentity;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
}

export const MSIAuthentication = ({ identity, MSIProps, GetTokenPicker, onManagedIdentityChange }: MSIAuthenticationProps): JSX.Element => {
  const intl = useIntl();

  const authNotEnabledError = intl.formatMessage({
    defaultMessage: 'Please enable managed identity for the logic app.',
    description: 'Error Message for disabled managed identity',
  });

  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'System-assigned managed identity dropdown option text',
  });

  const { MSIIdentity } = MSIProps;

  const managedIdentityOption: IDropdownOption[] = MSIIdentity
    ? [{ key: MSIIdentity, text: getIdentityDisplayName(MSIIdentity) }]
    : [{ key: ResourceIdentityType.SYSTEM_ASSIGNED, text: systemAssignedManagedIdentity }];

  return (
    <div className="msla-authentication-editor-MSI-container">
      {identity?.type ? (
        <div />
      ) : (
        <>
          <AuthenticationDropdown
            errorMessage={authNotEnabledError}
            selectedManagedIdentityKey={MSIIdentity ?? ResourceIdentityType.SYSTEM_ASSIGNED}
            options={managedIdentityOption}
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
      )}
    </div>
  );
};

function getIdentityDisplayName(msiIdentity: string): string {
  return msiIdentity.split('/').slice(-1)[0];
}
