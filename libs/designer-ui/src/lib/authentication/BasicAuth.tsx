import type { AuthProps, BasicProps } from '.';
import type { ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface BasicAuthenticationProps {
  basicProps: BasicProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const BasicAuthentication = ({ basicProps, GetTokenPicker, setCurrentProps }: BasicAuthenticationProps): JSX.Element => {
  const { basicUsername, basicPassword } = basicProps;

  const updateBasicUserName = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      basicProps: { ...prevState.basicProps, basicUsername: newState.value },
    }));
  };

  const updateBasicPassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      basicProps: { ...prevState.basicProps, basicPassword: newState.value },
    }));
  };

  return (
    <div className="msla-authentication-editor-basic-container">
      <AuthenticationProperty
        initialValue={basicUsername}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_USERNAME}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateBasicUserName}
      />
      <AuthenticationProperty
        initialValue={basicPassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateBasicPassword}
      />
    </div>
  );
};
