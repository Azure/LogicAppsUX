import type { AuthProps, RawProps } from '.';
import type { ChangeState, TokenPickerHandler } from '../editor/base';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface RawAuthenticationProps {
  rawProps: RawProps;
  tokenPickerHandler: TokenPickerHandler;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const RawAuthentication = ({ rawProps, tokenPickerHandler, setCurrentProps }: RawAuthenticationProps): JSX.Element => {
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
        tokenPickerHandler={tokenPickerHandler}
        onBlur={updateRawValue}
      />
    </div>
  );
};
