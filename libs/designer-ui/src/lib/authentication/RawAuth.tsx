import type { AuthProps, RawProps } from '.';
import type { BaseEditorProps, ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface RawAuthenticationProps extends Partial<BaseEditorProps> {
  rawProps: RawProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const RawAuthentication = ({ rawProps, setCurrentProps, ...props }: RawAuthenticationProps): JSX.Element => {
  const { rawValue } = rawProps;

  const updateRawValue = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      raw: { ...prevState.raw, rawValue: newState.value },
    }));
  };

  return (
    <div className="msla-authentication-editor-raw-container">
      <AuthenticationProperty
        {...props}
        dataAutomationId={'msla-authentication-editor-raw-value'}
        initialValue={rawValue}
        AuthProperty={AUTHENTICATION_PROPERTIES.RAW_VALUE}
        handleBlur={updateRawValue}
      />
    </div>
  );
};
