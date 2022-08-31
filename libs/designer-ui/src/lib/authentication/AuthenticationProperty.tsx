import type { ValueSegment } from '../editor';
import { StringEditor } from '../editor/string';
import { Label } from '../label';
import type { AuthProperty } from './util';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const AuthenticationProperty = ({ initialValue = [], AuthProperty, GetTokenPicker }: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <Label className="msla-authentication-editor-expanded-item-label" text={AuthProperty.displayName} isRequiredField={true} />
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          initialValue={initialValue}
          GetTokenPicker={GetTokenPicker}
          placeholder={AuthProperty.placeHolder}
          BasePlugins={{ tokens: true }}
          singleLine={true}
          tokenPickerButtonProps={{ buttonClassName: 'msla-editor-tokenpicker-button' }}
        />
      </div>
    </div>
  );
};
