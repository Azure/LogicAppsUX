import type { AuthProps, ClientCertificateProps } from '.';
import type { BaseEditorProps, ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface CertificateAuthenticationProps extends Partial<BaseEditorProps> {
  clientCertificateProps: ClientCertificateProps;
  isOAuth?: boolean;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const CertificateAuthentication = ({
  clientCertificateProps,
  isOAuth = false,
  setCurrentProps,
  ...props
}: CertificateAuthenticationProps): JSX.Element => {
  const { clientCertificatePfx, clientCertificatePassword } = clientCertificateProps;

  const updateClientCertificatePfx = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      clientCertificate: { ...prevState.clientCertificate, clientCertificatePfx: newState.value },
    }));
  };

  const updateClientCertificatePassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      clientCertificate: { ...prevState.clientCertificate, clientCertificatePassword: newState.value },
    }));
  };

  const updateOAuthTypeCertificatePfx = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthTypeCertificatePfx: newState.value },
    }));
  };

  const updateOAuthTypeCertificatePassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthTypeCertificatePassword: newState.value },
    }));
  };
  return (
    <div className="msla-authentication-editor-certificate-container">
      <AuthenticationProperty
        {...props}
        dataAutomationId={'msla-authentication-editor-client-certificate-pfx'}
        initialValue={clientCertificatePfx}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX}
        handleBlur={isOAuth ? updateOAuthTypeCertificatePfx : updateClientCertificatePfx}
      />
      <AuthenticationProperty
        {...props}
        dataAutomationId={'msla-authentication-editor-client-certificate-password'}
        initialValue={clientCertificatePassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD}
        passwordMask={true}
        handleBlur={isOAuth ? updateOAuthTypeCertificatePassword : updateClientCertificatePassword}
      />
    </div>
  );
};
