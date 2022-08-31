import type { ClientCertificateProps } from '.';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';

interface CertificateAuthenticationProps {
  clientCertificateProps: ClientCertificateProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const CertificateAuthentication = ({ clientCertificateProps, GetTokenPicker }: CertificateAuthenticationProps): JSX.Element => {
  const { clientCertificatePfx, clientCertificatePassword } = clientCertificateProps;
  return (
    <div className="msla-authentication-editor-certificate-container">
      <AuthenticationProperty
        initialValue={clientCertificatePfx}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationProperty
        initialValue={clientCertificatePassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD}
        GetTokenPicker={GetTokenPicker}
      />
    </div>
  );
};
