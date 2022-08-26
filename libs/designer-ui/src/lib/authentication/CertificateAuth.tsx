import { StringEditor } from '../editor/string';
import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';

interface CertificateAuthenticationProps {
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const CertificateAuthentication = ({ GetTokenPicker }: CertificateAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-certificate-container">
      <div className="msla-authentication-editor-expanded-item">
        <Label
          className="msla-authentication-editor-expanded-item-label"
          text={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX.displayName}
          isRequiredField={true}
        />
        <div className="msla-authentication-editor-expanded-editor-container">
          <StringEditor
            initialValue={[]}
            GetTokenPicker={GetTokenPicker}
            placeholder={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX.placeHolder}
            BasePlugins={{ tokens: true }}
            singleLine={true}
            tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
          />
        </div>
      </div>
      <div className="msla-authentication-editor-expanded-item">
        <Label
          className="msla-authentication-editor-expanded-item-label"
          text={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD.displayName}
          isRequiredField={true}
        />
        <div className="msla-authentication-editor-expanded-editor-container">
          <StringEditor
            initialValue={[]}
            GetTokenPicker={GetTokenPicker}
            placeholder={AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD.placeHolder}
            BasePlugins={{ tokens: true }}
            singleLine={true}
            tokenPickerButtonProps={{ buttonClassName: 'msla-authentication-editor-tokenpicker' }}
          />
        </div>
      </div>
    </div>
  );
};
