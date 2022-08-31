import type { ClientCertificateProps } from '..';
import type { ValueSegment } from '../../editor';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { CertificateAuthentication } from '../CertificateAuth';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AuthenticationOAuthType } from './AADOAuth';
import { AssertionErrorCode, AssertionException, format } from '@microsoft-logic-apps/utils';

interface AadOAuthCredentialsProps {
  selectedCredTypeKey: string;
  secret?: ValueSegment[];
  clientCertificateProps: ClientCertificateProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const AadOAuthCredentials = ({
  selectedCredTypeKey,
  secret,
  clientCertificateProps,
  GetTokenPicker,
}: AadOAuthCredentialsProps): JSX.Element => {
  const renderSelectedCredentials = (): JSX.Element => {
    switch (selectedCredTypeKey) {
      case AuthenticationOAuthType.SECRET:
        return (
          <AuthenticationProperty
            initialValue={secret}
            AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
            GetTokenPicker={GetTokenPicker}
          />
        );
      case AuthenticationOAuthType.CERTIFICATE:
        return <CertificateAuthentication GetTokenPicker={GetTokenPicker} clientCertificateProps={clientCertificateProps} />;
      default:
        throw new AssertionException(
          AssertionErrorCode.UNSUPPORTED_OAUTH_CREDENTIAL_TYPE,
          format("Unsupported OAuth credential type '{0}'.", selectedCredTypeKey)
        );
    }
  };
  return <>{renderSelectedCredentials}</>;
};
