import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { Label } from '../label';
import { BasicAuthentication } from './BasicAuth';
import { CertificateAuthentication } from './CertificateAuth';
import { MSIAuthentication } from './MSIAuth/MSIAuth';
import { RawAuthentication } from './RawAuth';
import { useBoolean } from '@fluentui/react-hooks';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { AssertionErrorCode, AssertionException, format } from '@microsoft-logic-apps/utils';
import { useState } from 'react';

const dropdownStyles: Partial<IDropdownStyles> = {
  title: {
    fontSize: '14px',
  },
};

export enum AuthenticationType {
  NONE = 'None',
  BASIC = 'Basic',
  CERTIFICATE = 'Client Certificate',
  OAUTH = 'Active Directory OAuth',
  RAW = 'Raw',
  MSI = 'Managed Identity',
}
export interface BasicProps {
  basicUsername?: ValueSegment[];
  basicPassword?: ValueSegment[];
}

export interface ClientCertificateProps {
  clientCertificatePfx?: ValueSegment[];
  clientCertificatePassword?: ValueSegment[];
}

export interface RawProps {
  rawValue?: ValueSegment[];
}
export interface MSIProps {
  MSIAudience?: ValueSegment[];
  MSIIdentity?: string;
}

export interface AuthenticationEditorOptions {
  supportedAuthTypes?: AuthenticationType[];
  identity?: ManagedIdentity;
}

interface AuthenticationEditorProps extends BaseEditorProps {
  authType?: string | number;
  AuthenticationEditorOptions: AuthenticationEditorOptions;
  basicProps?: BasicProps;
  clientCertificateProps?: ClientCertificateProps;
  rawProps?: RawProps;
  MSIProps?: MSIProps;
}

export const AuthenticationEditor = ({
  authType = AuthenticationType.NONE,
  AuthenticationEditorOptions,
  basicProps = {},
  clientCertificateProps = {},
  rawProps = {},
  MSIProps = {},
  GetTokenPicker,
}: AuthenticationEditorProps): JSX.Element => {
  const [codeView, toggleCodeView] = useBoolean(false);
  const [option, setOption] = useState<string | number>(authType);

  const renderAuthentication = () => {
    switch (option) {
      case AuthenticationType.BASIC:
        return <BasicAuthentication GetTokenPicker={GetTokenPicker} basicProps={basicProps} />;
      case AuthenticationType.CERTIFICATE:
        return <CertificateAuthentication GetTokenPicker={GetTokenPicker} clientCertificateProps={clientCertificateProps} />;
      case AuthenticationType.RAW:
        return <RawAuthentication GetTokenPicker={GetTokenPicker} rawProps={rawProps} />;
      case AuthenticationType.MSI:
        return (
          <MSIAuthentication
            GetTokenPicker={GetTokenPicker}
            identity={AuthenticationEditorOptions.identity}
            MSIProps={MSIProps}
            onManagedIdentityChange={onManagedIdentityDropdownChange}
          />
        );
      case AuthenticationType.NONE:
        return null;
      default:
        throw new AssertionException(
          AssertionErrorCode.UNSUPPORTED_AUTHENTICATION_TYPE,
          format("Unsupported authentication type '{0}'.", option)
        );
    }
  };

  const onManagedIdentityDropdownChange = (_event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void => {
    console.log(item);
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
          <Dropdown
            options={Object.values(AuthenticationType).map((type) => {
              return { key: type, text: type };
            })}
            selectedKey={option}
            onChange={handleKeyChange}
            styles={dropdownStyles}
          />
          {renderAuthentication()}
        </div>
      )}
      <div className="msla-authentication-default-view-mode">
        <EditorCollapseToggle collapsed={codeView} toggleCollapsed={toggleCodeView.toggle} />
      </div>
    </div>
  );
};
