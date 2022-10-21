import type { AuthProps, ClientCertificateProps } from '..';
import type { ValueSegment } from '../../editor';
import type { ChangeState, GetTokenPickerHandler } from '../../editor/base';
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
  getTokenPicker: GetTokenPickerHandler;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const AadOAuthCredentials = ({
  selectedCredTypeKey,
  secret,
  clientCertificateProps,
  getTokenPicker,
  setCurrentProps,
}: AadOAuthCredentialsProps): JSX.Element => {
  const updateOAuthTypeSecret = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      aadOAuth: { ...prevState.aadOAuth, oauthTypeSecret: newState.value },
    }));
  };

  const RenderSelectedCredentials = (): JSX.Element => {
    switch (selectedCredTypeKey) {
      case AuthenticationOAuthType.SECRET:
        return (
          <AuthenticationProperty
            initialValue={secret}
            AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
            getTokenPicker={getTokenPicker}
            onBlur={updateOAuthTypeSecret}
          />
        );
      case AuthenticationOAuthType.CERTIFICATE:
        return (
          <CertificateAuthentication
            clientCertificateProps={clientCertificateProps}
            isOAuth={true}
            getTokenPicker={getTokenPicker}
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
