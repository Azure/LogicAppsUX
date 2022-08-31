import type { RawProps } from '.';
import { AuthenticationProperty } from './AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from './util';

interface RawAuthenticationProps {
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  rawProps: RawProps;
}

export const RawAuthentication = ({ GetTokenPicker, rawProps }: RawAuthenticationProps): JSX.Element => {
  const { rawValue } = rawProps;
  return (
    <div className="msla-authentication-editor-raw-container">
      <AuthenticationProperty initialValue={rawValue} AuthProperty={AUTHENTICATION_PROPERTIES.RAW_VALUE} GetTokenPicker={GetTokenPicker} />
    </div>
  );
};
