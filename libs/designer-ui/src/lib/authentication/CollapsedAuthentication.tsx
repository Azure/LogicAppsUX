import type { AuthenticationType, AuthProps } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { CollapsedAuthenticationValidation } from './plugins/CollapsedAuthenticationValidation';
import type { Dispatch, SetStateAction } from 'react';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
}

export const CollapsedAuthentication = ({
  collapsedValue,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  setIsValid,
  setOption,
  serializeValue,
  ...props
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <EditorWrapper {...props} initialValue={collapsedValue} basePlugins={{ tabbable: true }}>
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
      </EditorWrapper>
    </div>
  );
};
