import type { AuthProps, ClientCertificateProps } from '.';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface CertificateAuthenticationProps {
  clientCertificateProps: ClientCertificateProps;
  isOAuth?: boolean;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  getTokenPicker: GetTokenPickerHandler;
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
        initialValue={clientCertificatePfx}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX}
        onBlur={isOAuth ? updateOAuthTypeCertificatePfx : updateClientCertificatePfx}
      />
      <AuthenticationProperty
        {...props}
        initialValue={clientCertificatePassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD}
        onBlur={isOAuth ? updateOAuthTypeCertificatePassword : updateClientCertificatePassword}
      />
    </div>
  );
};
