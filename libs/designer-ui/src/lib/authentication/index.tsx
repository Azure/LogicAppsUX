import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { StringEditor } from '../editor/string';
import { Label } from '../label';
import { AUTHENTICATION_PROPERTIES } from './util';
import { useBoolean } from '@fluentui/react-hooks';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { useState } from 'react';

const authenticationDropdownOptions: IDropdownOption[] = [
  { key: 'NONE', text: 'None' },
  { key: 'BASIC', text: 'Basic' },
  { key: 'CLIENT_CERTIFICATE', text: 'Client Certficate' },
  { key: 'ACTIVE_DIRECTORY_OAUTH', text: 'Active Directory OAuth' },
  { key: 'RAW', text: 'Raw' },
  { key: 'MANAGED_IDENTITY', text: 'Managed Identity' },
];

interface AuthenticationEditorProps extends BaseEditorProps {
  currentKey?: string | number;
}

export const AuthenticationEditor = ({ currentKey = 'NONE', GetTokenPicker }: AuthenticationEditorProps): JSX.Element => {
  const [codeView, toggleCodeView] = useBoolean(false);
  const [option, setOption] = useState<string | number>(currentKey);

  const renderAuthentication = () => {
    switch (option) {
      case 'BASIC':
        return renderBasicAuthentication();

      default:
        return null;
    }
  };

  const renderBasicAuthentication = (): JSX.Element => {
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

  const handleKeyChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption) => {
    const newKey = item?.key;
    if (newKey) {
      setOption(newKey);
    }
  };
  return (
    <div className="msla-authentication-editor-container">
      {codeView ? (
        <div />
      ) : (
        <div className="msla-authentication-editor-expanded-container">
          <div className="msla-authentication-editor-label">
            <Label text={'Authentication Type'} isRequiredField={true} />
          </div>
          <Dropdown options={authenticationDropdownOptions} selectedKey={option} onChange={handleKeyChange} />
          {renderAuthentication()}
        </div>
      )}
      <div className="msla-authentication-default-view-mode">
        <EditorCollapseToggle collapsed={codeView} toggleCollapsed={toggleCodeView.toggle} />
      </div>
    </div>
  );
};
