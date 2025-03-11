import type { AuthProps, ClientCertificateProps } from '..';
import type { ValueSegment } from '../../editor';
import type { BaseEditorProps, ChangeState } from '../../editor/base';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { CertificateAuthentication } from '../CertificateAuth';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AuthenticationOAuthType } from './AADOAuth';
import type { Dispatch, SetStateAction } from 'react';

interface AadOAuthCredentialsProps extends Partial<BaseEditorProps> {
  selectedCredTypeKey: string;
  secret?: ValueSegment[];
  clientCertificateProps: ClientCertificateProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const AadOAuthCredentials = ({
  selectedCredTypeKey,
  secret,
  clientCertificateProps,
  setCurrentProps,
  ...props
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
          {...props}
          dataAutomationId={'msla-authentication-editor-aad-oauth-secret'}
          passwordMask={true}
          initialValue={secret}
          AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
          handleBlur={updateOAuthTypeSecret}
        />
      ) : selectedCredTypeKey === AuthenticationOAuthType.CERTIFICATE ? (
        <CertificateAuthentication
          {...props}
          clientCertificateProps={clientCertificateProps}
          isOAuth={true}
          setCurrentProps={setCurrentProps}
        />
      ) : null}
    </>
  );
};
