import type { AuthProps, BasicProps } from '.';
import type { BaseEditorProps, ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface BasicAuthenticationProps extends Partial<BaseEditorProps> {
  basicProps: BasicProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const BasicAuthentication = ({ basicProps, setCurrentProps, ...props }: BasicAuthenticationProps): JSX.Element => {
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
        {...props}
        dataAutomationId={'msla-authentication-editor-basic-username'}
        initialValue={basicUsername}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_USERNAME}
        handleBlur={updateBasicUserName}
      />
      <AuthenticationProperty
        {...props}
        dataAutomationId={'msla-authentication-editor-basic-password'}
        initialValue={basicPassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD}
        handleBlur={updateBasicPassword}
        passwordMask={true}
      />
    </div>
  );
};
