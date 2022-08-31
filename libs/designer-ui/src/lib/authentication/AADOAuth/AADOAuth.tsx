import type { OAuthProps } from '..';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AadOAuthCredentials } from './AADOAuthCredentials';
import type { IDropdownOption } from '@fluentui/react';
import { useIntl } from 'react-intl';

export enum AuthenticationOAuthType {
  SECRET = 'Secret',
  CERTIFICATE = 'Certificate',
}

interface ActiveDirectoryAuthenticationProps {
  OauthProps: OAuthProps;
  onOauthAuthenticationTypeChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const ActiveDirectoryAuthentication = ({
  OauthProps,
  onOauthAuthenticationTypeChange,
  GetTokenPicker,
}: ActiveDirectoryAuthenticationProps): JSX.Element => {
  const intl = useIntl();
  const {
    OAuthTenant,
    OAuthAudience,
    OAuthAuthority,
    OAuthClientId,
    OAuthType = '',
    OAuthTypeSecret,
    OAuthTypeCertificatePfx,
    OAuthTypeCertificatePassword,
  } = OauthProps;
  const oAuthTypeLabel = intl.formatMessage({
    defaultMessage: 'Credential Type',
    description: 'Authentication OAuth Type Label',
  });

  const oAuthTypeSecretLabel = intl.formatMessage({
    defaultMessage: 'Secret',
    description: 'Authentication OAuth Secret Type Label',
  });

  const oAuthTypeCertificateLabel = intl.formatMessage({
    defaultMessage: 'Certificate',
    description: 'Authentication OAuth Certificate Type Label',
  });

  const aadOAuthCredentialTypes: IDropdownOption[] = zipDropDownOptions(
    [AuthenticationOAuthType.SECRET, AuthenticationOAuthType.CERTIFICATE],
    [oAuthTypeSecretLabel, oAuthTypeCertificateLabel]
  );
  return (
    <div className="msla-authentication-editor-OAuth-container">
      <AuthenticationProperty
        initialValue={OAuthAuthority}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUTHORITY}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationProperty
        initialValue={OAuthTenant}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_TENANT}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationProperty
        initialValue={OAuthAudience}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUDIENCE}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationProperty
        initialValue={OAuthClientId}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_CLIENT_ID}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationDropdown
        dropdownLabel={oAuthTypeLabel}
        selectedKey={OAuthType}
        options={aadOAuthCredentialTypes}
        onChange={onOauthAuthenticationTypeChange}
      />
      <AadOAuthCredentials
        selectedCredTypeKey={OAuthType}
        secret={OAuthTypeSecret}
        clientCertificateProps={{ clientCertificatePfx: OAuthTypeCertificatePfx, clientCertificatePassword: OAuthTypeCertificatePassword }}
        GetTokenPicker={GetTokenPicker}
      />
    </div>
  );
};

function zipDropDownOptions(keys: string[], texts: string[]): IDropdownOption[] {
  return keys.map((key, index) => {
    const text = texts[index];
    return {
      key,
      text,
    };
  });
}
