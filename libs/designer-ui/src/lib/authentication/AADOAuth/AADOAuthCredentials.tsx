import type { AuthProps, ClientCertificateProps } from '..';
import type { ValueSegment } from '../../editor';
import type { ChangeState } from '../../editor/base';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { CertificateAuthentication } from '../CertificateAuth';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AuthenticationOAuthType } from './AADOAuth';
import { AssertionErrorCode, AssertionException, format } from '@microsoft-logic-apps/utils';
import type { Dispatch, SetStateAction } from 'react';

interface AadOAuthCredentialsProps {
  selectedCredTypeKey: string;
  secret?: ValueSegment[];
  clientCertificateProps: ClientCertificateProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const AadOAuthCredentials = ({
  selectedCredTypeKey,
  secret,
  clientCertificateProps,
  GetTokenPicker,
  setCurrentProps,
}: AadOAuthCredentialsProps): JSX.Element => {
  const updateOAuthTypeSecret = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuthProps: { ...prevState.aadOAuthProps, OAuthTypeSecret: newState.value },
    }));
  };

  const RenderSelectedCredentials = (): JSX.Element => {
    switch (selectedCredTypeKey) {
      case AuthenticationOAuthType.SECRET:
        return (
          <AuthenticationProperty
            initialValue={secret}
            AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
            GetTokenPicker={GetTokenPicker}
            onBlur={updateOAuthTypeSecret}
          />
        );
      case AuthenticationOAuthType.CERTIFICATE:
        return (
          <CertificateAuthentication
            clientCertificateProps={clientCertificateProps}
            isOAuth={true}
            GetTokenPicker={GetTokenPicker}
            setCurrentProps={setCurrentProps}
          />
        );
      default:
        throw new AssertionException(
          AssertionErrorCode.UNSUPPORTED_OAUTH_CREDENTIAL_TYPE,
          format("Unsupported OAuth credential type '{0}'.", selectedCredTypeKey)
        );
    }
  };
  return <RenderSelectedCredentials />;
};
