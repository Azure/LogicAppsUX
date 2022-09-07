import type { AuthProps, ClientCertificateProps } from '.';
import type { ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface CertificateAuthenticationProps {
  clientCertificateProps: ClientCertificateProps;
  isOAuth?: boolean;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const CertificateAuthentication = ({
  clientCertificateProps,
  isOAuth = false,
  GetTokenPicker,
  setCurrentProps,
}: CertificateAuthenticationProps): JSX.Element => {
  const { clientCertificatePfx, clientCertificatePassword } = clientCertificateProps;

  const updateClientCertificatePfx = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      clientCertificateProps: { ...prevState.clientCertificateProps, clientCertificatePfx: newState.value },
    }));
  };

  const updateClientCertificatePassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      clientCertificateProps: { ...prevState.clientCertificateProps, clientCertificatePassword: newState.value },
    }));
  };

  const updateOAuthTypeCertificatePfx = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuthProps: { ...prevState.aadOAuthProps, OAuthTypeCertificatePfx: newState.value },
    }));
  };

  const updateOAuthTypeCertificatePassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuthProps: { ...prevState.aadOAuthProps, OAuthTypeCertificatePassword: newState.value },
    }));
  };
  return (
    <div className="msla-authentication-editor-certificate-container">
      <AuthenticationProperty
        initialValue={clientCertificatePfx}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX}
        GetTokenPicker={GetTokenPicker}
        onBlur={isOAuth ? updateOAuthTypeCertificatePfx : updateClientCertificatePfx}
      />
      <AuthenticationProperty
        initialValue={clientCertificatePassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD}
        GetTokenPicker={GetTokenPicker}
        onBlur={isOAuth ? updateOAuthTypeCertificatePassword : updateClientCertificatePassword}
      />
    </div>
  );
};
