import { StringEditor } from '../editor/string';
import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';

interface RawAuthenticationProps {
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const RawAuthentication = ({ GetTokenPicker }: RawAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-raw-container">
      <div className="msla-authentication-editor-expanded-item">
        <Label
          className="msla-authentication-editor-expanded-item-label"
          text={AUTHENTICATION_PROPERTIES.RAW_VALUE.displayName}
          isRequiredField={true}
        />
        <div className="msla-authentication-editor-expanded-editor-container">
          <StringEditor
            initialValue={[]}
            GetTokenPicker={GetTokenPicker}
            placeholder={AUTHENTICATION_PROPERTIES.RAW_VALUE.placeHolder}
            BasePlugins={{ tokens: true }}
            singleLine={true}
            tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
          />
        </div>
      </div>
    </div>
  );
};
