import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import type { AuthProperty } from './util';
import { Label } from '../label';
import { css } from '@fluentui/utilities';

interface AuthenticationPropertyProps extends Partial<BaseEditorProps> {
  AuthProperty: AuthProperty;
  handleBlur?: ChangeHandler;
  passwordMask?: boolean;
}

export const AuthenticationProperty = ({
  initialValue = [],
  AuthProperty,
  handleBlur,
  ...props
}: AuthenticationPropertyProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-expanded-item">
      <div className="msla-input-parameter-label">
        <Label isRequiredField={AuthProperty.isRequired} text={AuthProperty.displayName} />
      </div>
      <div className="msla-authentication-editor-expanded-editor-container">
        <StringEditor
          {...props}
          valueType={AuthProperty.type}
          className={css('msla-authentication-editor-expanded-editor', props.passwordMask && 'hasIcon')}
          initialValue={initialValue}
          placeholder={AuthProperty.placeHolder}
          basePlugins={{ tokens: true, passwordMask: props.passwordMask }}
          editorBlur={handleBlur}
        />
      </div>
    </div>
  );
};
