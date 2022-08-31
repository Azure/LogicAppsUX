import type { BasicProps } from '.';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';

interface BasicAuthenticationProps {
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  basicProps: BasicProps;
}

export const BasicAuthentication = ({ basicProps, GetTokenPicker }: BasicAuthenticationProps): JSX.Element => {
  const { basicUsername, basicPassword } = basicProps;
  return (
    <div className="msla-authentication-editor-basic-container">
      <AuthenticationProperty
        initialValue={basicUsername}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_USERNAME}
        GetTokenPicker={GetTokenPicker}
      />
      <AuthenticationProperty
        initialValue={basicPassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD}
        GetTokenPicker={GetTokenPicker}
      />
    </div>
  );
};
