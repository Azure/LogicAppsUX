import type { AuthProps, ClientCertificateProps } from '..';
import type { ValueSegment } from '../../editor';
import type { ChangeState, GetTokenPickerHandler } from '../../editor/base';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { CertificateAuthentication } from '../CertificateAuth';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AuthenticationOAuthType } from './AADOAuth';
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

  return (
    <>
      {selectedCredTypeKey === AuthenticationOAuthType.SECRET ? (
        <AuthenticationProperty
          initialValue={secret}
          AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
          getTokenPicker={getTokenPicker}
          onBlur={updateOAuthTypeSecret}
        />
      ) : selectedCredTypeKey === AuthenticationOAuthType.CERTIFICATE ? (
        <CertificateAuthentication
          clientCertificateProps={clientCertificateProps}
          isOAuth={true}
          getTokenPicker={getTokenPicker}
          setCurrentProps={setCurrentProps}
        />
      ) : null}
    </>
  );
};
