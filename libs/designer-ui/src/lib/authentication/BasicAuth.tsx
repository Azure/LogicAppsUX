import type { AuthProps, BasicProps } from '.';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface BasicAuthenticationProps {
  basicProps: BasicProps;
  getTokenPicker: GetTokenPickerHandler;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const BasicAuthentication = ({ basicProps, getTokenPicker, setCurrentProps }: BasicAuthenticationProps): JSX.Element => {
  const { basicUsername, basicPassword } = basicProps;

  const updateBasicUserName = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      basic: { ...prevState.basic, basicUsername: newState.value },
    }));
  };

  const updateBasicPassword = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      basic: { ...prevState.basic, basicPassword: newState.value },
    }));
  };

  return (
    <div className="msla-authentication-editor-basic-container">
      <AuthenticationProperty
        initialValue={basicUsername}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_USERNAME}
        getTokenPicker={getTokenPicker}
        onBlur={updateBasicUserName}
      />
      <AuthenticationProperty
        initialValue={basicPassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD}
        getTokenPicker={getTokenPicker}
        onBlur={updateBasicPassword}
      />
    </div>
  );
};
