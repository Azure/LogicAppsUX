import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import type { AuthenticationOAuthType } from './AADOAuth/AADOAuth';
import { ActiveDirectoryAuthentication } from './AADOAuth/AADOAuth';
import { AuthenticationDropdown } from './AuthenticationDropdown';
import { BasicAuthentication } from './BasicAuth';
import { CertificateAuthentication } from './CertificateAuth';
import { CollapsedAuthentication } from './CollapsedAuthentication';
import { MSIAuthentication } from './MSIAuth/MSIAuth';
import { RawAuthentication } from './RawAuth';
import { parseAuthEditor } from './util';
import { useBoolean } from '@fluentui/react-hooks';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { AssertionErrorCode, AssertionException, format } from '@microsoft-logic-apps/utils';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

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

export interface OAuthProps {
  OAuthTenant?: ValueSegment[];
  OAuthAudience?: ValueSegment[];
  OAuthAuthority?: ValueSegment[];
  OAuthClientId?: ValueSegment[];
  OAuthType?: AuthenticationOAuthType;
  OAuthTypeSecret?: ValueSegment[];
  OAuthTypeCertificatePfx?: ValueSegment[];
  OAuthTypeCertificatePassword?: ValueSegment[];
}
export interface AuthenticationEditorOptions {
  supportedAuthTypes?: AuthenticationType[];
  identity?: ManagedIdentity;
}

export interface AuthProps {
  basicProps?: BasicProps;
  clientCertificateProps?: ClientCertificateProps;
  rawProps?: RawProps;
  msiProps?: MSIProps;
  aadOAuthProps?: OAuthProps;
}

interface AuthenticationEditorProps extends BaseEditorProps {
  authType?: string | number;
  AuthenticationEditorOptions: AuthenticationEditorOptions;
  authProps: AuthProps;
}

export const AuthenticationEditor = ({
  authType = AuthenticationType.NONE,
  AuthenticationEditorOptions,
  authProps,
  initialValue,
  GetTokenPicker,
}: AuthenticationEditorProps): JSX.Element => {
  const intl = useIntl();
  const [codeView, { toggle: toggleCodeView }] = useBoolean(false);
  const [option, setOption] = useState<string | number>(authType);
  const [collapsedValue, setCollapsedValue] = useState(initialValue);
  const [currentProps, setCurrentProps] = useState<AuthProps>(authProps);
  const { basicProps = {}, clientCertificateProps = {}, rawProps = {}, msiProps = {}, aadOAuthProps = {} } = currentProps;

  const updateCollapsedValue = useCallback(() => {
    setCollapsedValue(parseAuthEditor(option as AuthenticationType, currentProps));
  }, [currentProps, option]);

  useEffect(() => {
    updateCollapsedValue();
  }, [option, updateCollapsedValue]);

  const renderAuthentication = () => {
    switch (option) {
      case AuthenticationType.BASIC:
        return <BasicAuthentication basicProps={basicProps} GetTokenPicker={GetTokenPicker} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.CERTIFICATE:
        return (
          <CertificateAuthentication
            clientCertificateProps={clientCertificateProps}
            GetTokenPicker={GetTokenPicker}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.RAW:
        return <RawAuthentication rawProps={rawProps} GetTokenPicker={GetTokenPicker} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.MSI:
        return (
          <MSIAuthentication
            identity={AuthenticationEditorOptions.identity}
            msiProps={msiProps}
            onManagedIdentityChange={onManagedIdentityDropdownChange}
            GetTokenPicker={GetTokenPicker}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.OAUTH:
        return (
          <ActiveDirectoryAuthentication OauthProps={aadOAuthProps} GetTokenPicker={GetTokenPicker} setCurrentProps={setCurrentProps} />
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
    setCurrentProps((prevState: AuthProps) => ({
      msiProps: { ...prevState.msiProps, MSIIdentity: item.text as string },
    }));
  };

  const handleKeyChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption) => {
    const newKey = item?.key;
    if (newKey) {
      setOption(newKey);
    }
  };

  const authenticationTypeLabel = intl.formatMessage({
    defaultMessage: 'Authentication Type',
    description: 'Label for Authentication Type dropdown',
  });

  return (
    <div className="msla-authentication-editor-container">
      {codeView ? (
        <CollapsedAuthentication
          collapsedValue={collapsedValue}
          errorMessage=""
          setCollapsedValue={setCollapsedValue}
          GetTokenPicker={GetTokenPicker}
        />
      ) : (
        <div className="msla-authentication-editor-expanded-container">
          <AuthenticationDropdown
            dropdownLabel={authenticationTypeLabel}
            selectedKey={option as string}
            options={Object.values(AuthenticationType).map((type) => {
              return { key: type, text: type };
            })}
            onChange={handleKeyChange}
          />
          {renderAuthentication()}
        </div>
      )}
      <div className="msla-authentication-default-view-mode">
        <EditorCollapseToggle collapsed={codeView} toggleCollapsed={toggleCodeView} />
      </div>
    </div>
  );
};
