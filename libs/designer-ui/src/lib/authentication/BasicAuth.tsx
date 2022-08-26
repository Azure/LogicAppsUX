import { StringEditor } from '../editor/string';
import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';

interface BasicAuthenticationProps {
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const BasicAuthentication = ({ GetTokenPicker }: BasicAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-basic-container">
      <div className="msla-authentication-editor-expanded-item">
        <Label
          className="msla-authentication-editor-expanded-item-label"
          text={AUTHENTICATION_PROPERTIES.BASIC_USERNAME.displayName}
          isRequiredField={true}
        />
        <div className="msla-authentication-editor-expanded-editor-container">
          <StringEditor
            initialValue={[]}
            GetTokenPicker={GetTokenPicker}
            placeholder={AUTHENTICATION_PROPERTIES.BASIC_USERNAME.placeHolder}
            BasePlugins={{ tokens: true }}
            singleLine={true}
            tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
          />
        </div>
      </div>
      <div className="msla-authentication-editor-expanded-item">
        <Label
          className="msla-authentication-editor-expanded-item-label"
          text={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD.displayName}
          isRequiredField={true}
        />
        <div className="msla-authentication-editor-expanded-editor-container">
          <StringEditor
            initialValue={[]}
            GetTokenPicker={GetTokenPicker}
            placeholder={AUTHENTICATION_PROPERTIES.BASIC_PASSWORD.placeHolder}
            BasePlugins={{ tokens: true }}
            singleLine={true}
            tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
          />
        </div>
      </div>
    </div>
  );
};
