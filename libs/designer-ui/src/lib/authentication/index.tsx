import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeDictionaryValidation } from '../editor/base/utils/helper';
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
import { getIntl } from '@microsoft/intl-logic-apps';
import type { ManagedIdentity } from '@microsoft/utils-logic-apps';
import { AssertionErrorCode, AssertionException, format } from '@microsoft/utils-logic-apps';
import { useUpdateEffect } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export enum AuthenticationType {
  NONE = 'None',
  BASIC = 'Basic',
  CERTIFICATE = 'ClientCertificate',
  OAUTH = 'ActiveDirectoryOAuth',
  RAW = 'Raw',
  MSI = 'ManagedServiceIdentity',
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
  msiAudience?: ValueSegment[];
  msiIdentity?: string;
}

export interface OAuthProps {
  oauthTenant?: ValueSegment[];
  oauthAudience?: ValueSegment[];
  oauthAuthority?: ValueSegment[];
  oauthClientId?: ValueSegment[];
  oauthType?: AuthenticationOAuthType;
  oauthTypeSecret?: ValueSegment[];
  oauthTypeCertificatePfx?: ValueSegment[];
  oauthTypeCertificatePassword?: ValueSegment[];
}
export interface AuthenticationEditorOptions {
  supportedAuthTypes: AuthenticationType[];
  identity?: ManagedIdentity;
}

export interface AuthProps {
  basic?: BasicProps;
  clientCertificate?: ClientCertificateProps;
  raw?: RawProps;
  msi?: MSIProps;
  aadOAuth?: OAuthProps;
}

interface AuthenticationEditorProps extends BaseEditorProps {
  type: AuthenticationType;
  options: AuthenticationEditorOptions;
  authenticationValue: AuthProps;
  readOnly?: boolean;
}

export const AuthenticationEditor = ({
  type = AuthenticationType.NONE,
  options,
  authenticationValue,
  initialValue,
  getTokenPicker,
  onChange,
}: AuthenticationEditorProps): JSX.Element => {
  const intl = useIntl();
  const [codeView, { toggle: toggleCodeView }] = useBoolean(false);
  const [option, setOption] = useState<AuthenticationType>(type);
  const [collapsedValue, setCollapsedValue] = useState(initialValue);
  const [currentProps, setCurrentProps] = useState<AuthProps>(authenticationValue);
  const [isValid, setIsValid] = useState(initializeDictionaryValidation(initialValue));
  const { basic = {}, clientCertificate = {}, raw = {}, msi = {}, aadOAuth = {} } = currentProps;

  useUpdateEffect(() => {
    const collapsedValue = parseAuthEditor(option, currentProps);
    setCollapsedValue(collapsedValue);
    onChange?.({ value: collapsedValue, viewModel: { type: option, authenticationValue: currentProps } });
  }, [option, currentProps]);

  const renderAuthentication = () => {
    switch (option) {
      case AuthenticationType.BASIC:
        return <BasicAuthentication basicProps={basic} getTokenPicker={getTokenPicker} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.CERTIFICATE:
        return (
          <CertificateAuthentication
            clientCertificateProps={clientCertificate}
            getTokenPicker={getTokenPicker}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.RAW:
        return <RawAuthentication rawProps={raw} getTokenPicker={getTokenPicker} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.MSI:
        return (
          <MSIAuthentication
            identity={options?.identity}
            msiProps={msi}
            getTokenPicker={getTokenPicker}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.OAUTH:
        return <ActiveDirectoryAuthentication OauthProps={aadOAuth} getTokenPicker={getTokenPicker} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.NONE:
        return null;
      default:
        throw new AssertionException(
          AssertionErrorCode.UNSUPPORTED_AUTHENTICATION_TYPE,
          format("Unsupported authentication type '{0}'.", option)
        );
    }
  };

  const handleKeyChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption) => {
    const newKey = item?.key as AuthenticationType;
    if (newKey) {
      setOption(newKey);
    }
  };

  const authenticationTypeLabel = intl.formatMessage({
    defaultMessage: 'Authentication Type',
    description: 'Label for Authentication Type dropdown',
  });

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to code view mode',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to default view mode',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  return (
    <div className="msla-authentication-editor-container">
      {codeView ? (
        <CollapsedAuthentication
          collapsedValue={collapsedValue}
          isValid={isValid}
          setCollapsedValue={setCollapsedValue}
          getTokenPicker={getTokenPicker}
          setIsValid={setIsValid}
          setCurrentProps={setCurrentProps}
          setOption={setOption}
        />
      ) : (
        <div className="msla-authentication-editor-expanded-container">
          <AuthenticationDropdown
            dropdownLabel={authenticationTypeLabel}
            selectedKey={option}
            options={getAuthenticationTypes(options.supportedAuthTypes)}
            onChange={handleKeyChange}
          />
          {renderAuthentication()}
        </div>
      )}
      <div className="msla-authentication-default-view-mode">
        <EditorCollapseToggle
          label={codeView ? collapsedLabel : expandedLabel}
          collapsed={codeView}
          toggleCollapsed={toggleCodeView}
          disabled={codeView && !isValid}
        />
      </div>
    </div>
  );
};

const getAuthenticationTypes = (supportedTypes: AuthenticationType[]): IDropdownOption[] => {
  const intl = getIntl();
  return supportedTypes.map((type) => {
    switch (type) {
      case AuthenticationType.BASIC:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Basic', description: 'Authentication type' }),
        };
      case AuthenticationType.CERTIFICATE:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Client Certificate', description: 'Authentication type' }),
        };

      case AuthenticationType.OAUTH:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Active Directory OAuth', description: 'Authentication type' }),
        };

      case AuthenticationType.RAW:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Raw', description: 'Authentication type' }),
        };

      case AuthenticationType.MSI:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Managed Identity', description: 'Authentication type' }),
        };

      default:
        return { key: type, text: type };
    }
  });
};
