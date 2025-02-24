import type { ValueSegment } from '../editor';
import type { ChangeHandler, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { StringEditor } from '../editor/string';
import type { AuthProperty } from './util';
import { Label } from '../label';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  readonly?: boolean;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  getTokenPicker: GetTokenPickerHandler;
  onBlur?: ChangeHandler;
  passwordMask?: boolean;
}

export const AuthenticationProperty = ({ initialValue = [], AuthProperty, onBlur, ...props }: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <div className="msla-input-parameter-label">
        <Label isRequiredField={AuthProperty.isRequired} text={AuthProperty.displayName} />
      </div>
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          {...props}
          valueType={AuthProperty.type}
          className="msla-authentication-editor-expanded-editor"
          initialValue={initialValue}
          placeholder={AuthProperty.placeHolder}
          basePlugins={{ tokens: true, passwordMask: props.passwordMask }}
          editorBlur={onBlur}
        />
      </div>
    </div>
  );
};
