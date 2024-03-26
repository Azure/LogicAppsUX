import type { ChangeHandler } from '@microsoft/logic-apps-shared';
import type { ValueSegmentUI } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { StringEditor } from '../editor/string';
import type { AuthProperty } from './util';
import { Label } from '@fluentui/react';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegmentUI[];
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  readonly?: boolean;
  tokenMapping?: Record<string, ValueSegmentUI>;
  loadParameterValueFromString?: (value: string) => ValueSegmentUI[];
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
