import type { ValueSegment } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import { Label } from '../label';
import type { AuthProperty } from './util';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  onBlur?: ChangeHandler;
}

export const AuthenticationProperty = ({
  initialValue = [],
  AuthProperty,
  GetTokenPicker,
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
          GetTokenPicker={GetTokenPicker}
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
