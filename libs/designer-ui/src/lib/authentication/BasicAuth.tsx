import type { AuthProps, BasicProps } from '.';
import type { ValueSegment } from '../editor';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface BasicAuthenticationProps {
  basicProps: BasicProps;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  readonly?: boolean;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
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
        initialValue={basicUsername}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_USERNAME}
        onBlur={updateBasicUserName}
      />
      <AuthenticationProperty
        {...props}
        initialValue={basicPassword}
        AuthProperty={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD}
        onBlur={updateBasicPassword}
      />
    </div>
  );
};
