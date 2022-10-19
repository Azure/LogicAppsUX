import type { ValueSegment } from '../editor';
import type { ChangeHandler, GetTokenPickerHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import { Label } from '../label';
import type { AuthProperty } from './util';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  getTokenPicker: GetTokenPickerHandler;
  onBlur?: ChangeHandler;
}

export const AuthenticationProperty = ({
  initialValue = [],
  AuthProperty,
  getTokenPicker,
  onBlur,
}: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <Label
        className="msla-authentication-editor-expanded-item-label"
        text={AuthProperty.displayName}
        isRequiredField={AuthProperty.isRequired}
      />
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          initialValue={initialValue}
          getTokenPicker={getTokenPicker}
          placeholder={AuthProperty.placeHolder}
          BasePlugins={{ tokens: true }}
          singleLine={true}
          tokenPickerButtonProps={{ buttonClassName: 'msla-editor-tokenpicker-button' }}
          onChange={onBlur}
        />
      </div>
    </div>
  );
};
