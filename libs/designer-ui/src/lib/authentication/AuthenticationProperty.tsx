import type { ValueSegment } from '../editor';
import type { ChangeHandler, GetTokenPickerHandler } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { StringEditor } from '../editor/string';
import type { AuthProperty } from './util';
import { Label } from '@fluentui/react';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  readonly?: boolean;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  getTokenPicker: GetTokenPickerHandler;
  onBlur?: ChangeHandler;
}

export const AuthenticationProperty = ({ initialValue = [], AuthProperty, onBlur, ...props }: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={AuthProperty.isRequired}>
          {AuthProperty.displayName}
        </Label>
      </div>
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          {...props}
          valueType={AuthProperty.type}
          className="msla-authentication-editor-expanded-editor"
          initialValue={initialValue}
          placeholder={AuthProperty.placeHolder}
          basePlugins={{ tokens: true }}
          editorBlur={onBlur}
        />
      </div>
    </div>
  );
};
