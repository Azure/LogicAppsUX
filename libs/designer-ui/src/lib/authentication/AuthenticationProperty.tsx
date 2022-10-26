import type { ValueSegment } from '../editor';
import type { ChangeHandler, TokenPickerHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import type { AuthProperty } from './util';
import { Label } from '@fluentui/react';

interface AuthenticationPropertyProps {
  AuthProperty: AuthProperty;
  initialValue?: ValueSegment[];
  tokenPickerHandler: TokenPickerHandler;
  onBlur?: ChangeHandler;
}

export const AuthenticationProperty = ({
  initialValue = [],
  AuthProperty,
  tokenPickerHandler,
  onBlur,
}: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={AuthProperty.isRequired}>
          {AuthProperty.displayName}
        </Label>
      </div>
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          className="msla-authentication-editor-expanded-editor"
          initialValue={initialValue}
          placeholder={AuthProperty.placeHolder}
          BasePlugins={{ tokens: true }}
          singleLine={true}
          tokenPickerHandler={{ ...tokenPickerHandler, tokenPickerButtonProps: { buttonClassName: 'msla-editor-tokenpicker-button' } }}
          onChange={onBlur}
        />
      </div>
    </div>
  );
};
