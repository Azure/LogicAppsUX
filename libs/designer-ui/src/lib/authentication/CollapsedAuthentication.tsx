import type { AuthenticationType, AuthProps } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { CollapsedAuthenticationSerialization } from './plugins/CollapsedAuthenticationSerialization';
import type { Dispatch, SetStateAction } from 'react';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  setToggleEnabled: (b: boolean) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
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
  setCurrentProps,
  setToggleEnabled,
  setOption,
  serializeValue,
  ...props
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <EditorWrapper {...props} initialValue={collapsedValue} basePlugins={{ tabbable: true }}>
        <CollapsedAuthenticationSerialization
          className={'msla-auth-editor-validation'}
          setToggleEnabled={setToggleEnabled}
          setCurrentProps={setCurrentProps}
          setOption={setOption}
          serializeValue={serializeValue}
        />
      </EditorWrapper>
    </div>
  );
};
