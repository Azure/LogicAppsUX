import type { AuthProps, ClientCertificateProps } from '..';
import type { ValueSegmentUI } from '../../editor';
import type { GetTokenPickerHandler } from '../../editor/base';
import type { ChangeState} from '@microsoft/logic-apps-shared';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { CertificateAuthentication } from '../CertificateAuth';
import { AUTHENTICATION_PROPERTIES } from '../util';
import { AuthenticationOAuthType } from './AADOAuth';
import type { Dispatch, SetStateAction } from 'react';

interface AadOAuthCredentialsProps {
  selectedCredTypeKey: string;
  secret?: ValueSegmentUI[];
  clientCertificateProps: ClientCertificateProps;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegmentUI>;
  loadParameterValueFromString?: (value: string) => ValueSegmentUI[];
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
          initialValue={secret}
          AuthProperty={AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET}
          onBlur={updateOAuthTypeSecret}
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
