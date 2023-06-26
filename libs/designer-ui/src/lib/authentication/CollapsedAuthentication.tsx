import type { AuthenticationType, AuthProps } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { CollapsedAuthenticationValidation } from './plugins/CollapsedAuthenticationValidation';
import type { Dispatch, SetStateAction } from 'react';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  getTokenPicker: GetTokenPickerHandler;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
}

export const CollapsedAuthentication = ({
  collapsedValue,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  getTokenPicker,
  setIsValid,
  setOption,
  serializeValue,
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <BaseEditor initialValue={collapsedValue} getTokenPicker={getTokenPicker} BasePlugins={{ tokens: true, tabbable: true }}>
        <CollapsedAuthenticationValidation
          className={'msla-auth-editor-validation'}
          collapsedValue={collapsedValue}
          isValid={isValid}
          setCollapsedValue={setCollapsedValue}
          setCurrentProps={setCurrentProps}
          setIsValid={setIsValid}
          setOption={setOption}
          serializeValue={serializeValue}
        />
      </BaseEditor>
    </div>
  );
};
