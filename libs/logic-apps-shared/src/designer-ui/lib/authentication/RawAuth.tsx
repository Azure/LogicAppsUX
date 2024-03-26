import type { AuthProps, RawProps } from '.';
import type { ValueSegmentUI } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import type { ChangeState} from '@microsoft/logic-apps-shared';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';
import type { Dispatch, SetStateAction } from 'react';

interface RawAuthenticationProps {
  rawProps: RawProps;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegmentUI>;
  loadParameterValueFromString?: (value: string) => ValueSegmentUI[];
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
        initialValue={rawValue}
        AuthProperty={AUTHENTICATION_PROPERTIES.RAW_VALUE}
        onBlur={updateRawValue}
      />
    </div>
  );
};
