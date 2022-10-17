import type { AuthProps, OAuthProps } from '..';
import type { ChangeState } from '../../editor/base';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AadOAuthCredentials } from './AADOAuthCredentials';
import type { IDropdownOption } from '@fluentui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export enum AuthenticationOAuthType {
  SECRET = 'Secret',
  CERTIFICATE = 'Certificate',
}

interface ActiveDirectoryAuthenticationProps {
  OauthProps: OAuthProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const ActiveDirectoryAuthentication = ({
  OauthProps,
  GetTokenPicker,
  setCurrentProps,
}: ActiveDirectoryAuthenticationProps): JSX.Element => {
  const intl = useIntl();
  const {
    oauthTenant,
    oauthAudience,
    oauthAuthority,
    oauthClientId,
    oauthType = AuthenticationOAuthType.SECRET,
    oauthTypeSecret,
    oauthTypeCertificatePfx,
    oauthTypeCertificatePassword,
  } = OauthProps;

  const [type, setOauthType] = useState<string | number>(oauthType);

  const updateOAuthAuthority = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthAuthority: newState.value },
    }));
  };

  const updateOAuthTenant = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthTenant: newState.value },
    }));
  };

  const updateOAuthAudience = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthAudience: newState.value },
    }));
  };

  const updateOAuthClientId = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthClientId: newState.value },
    }));
  };

  const oAuthTypeLabel = intl.formatMessage({
    defaultMessage: 'Credential Type',
    description: 'Authentication OAuth Type Label',
  });

  const onAuthenticationTypeDropdownChange = (_event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void => {
    const newKey = item?.key;
    if (newKey) {
      setOauthType(newKey);
      setCurrentProps((prevState: AuthProps) => ({
        ...prevState,
        aadOAuth: { ...prevState.aadOAuth, oauthType: item.key as AuthenticationOAuthType },
      }));
    }
  };

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
        initialValue={oauthAuthority}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUTHORITY}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateOAuthAuthority}
      />
      <AuthenticationProperty
        initialValue={oauthTenant}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_TENANT}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateOAuthTenant}
      />
      <AuthenticationProperty
        initialValue={oauthAudience}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUDIENCE}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateOAuthAudience}
      />
      <AuthenticationProperty
        initialValue={oauthClientId}
        AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_CLIENT_ID}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateOAuthClientId}
      />
      <AuthenticationDropdown
        dropdownLabel={oAuthTypeLabel}
        selectedKey={type as string}
        options={aadOAuthCredentialTypes}
        onChange={onAuthenticationTypeDropdownChange}
      />
      <AadOAuthCredentials
        selectedCredTypeKey={type as string}
        secret={oauthTypeSecret}
        clientCertificateProps={{ clientCertificatePfx: oauthTypeCertificatePfx, clientCertificatePassword: oauthTypeCertificatePassword }}
        GetTokenPicker={GetTokenPicker}
        setCurrentProps={setCurrentProps}
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
