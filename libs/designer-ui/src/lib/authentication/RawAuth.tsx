import type { AuthProps, RawProps } from '.';
import type { ChangeState } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface RawAuthenticationProps {
  rawProps: RawProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const RawAuthentication = ({ rawProps, GetTokenPicker, setCurrentProps }: RawAuthenticationProps): JSX.Element => {
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
        initialValue={rawValue}
        AuthProperty={AUTHENTICATION_PROPERTIES.RAW_VALUE}
        GetTokenPicker={GetTokenPicker}
        onBlur={updateRawValue}
      />
    </div>
  );
};
