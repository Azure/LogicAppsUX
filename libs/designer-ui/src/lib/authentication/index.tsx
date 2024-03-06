import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { isTokenValueSegment } from '../editor/base/utils/helper';
import type { AuthenticationOAuthType } from './AADOAuth/AADOAuth';
import { ActiveDirectoryAuthentication } from './AADOAuth/AADOAuth';
import { AuthenticationDropdown } from './AuthenticationDropdown';
import { BasicAuthentication } from './BasicAuth';
import { CertificateAuthentication } from './CertificateAuth';
import { CollapsedAuthentication } from './CollapsedAuthentication';
import { MSIAuthentication } from './MSIAuth/MSIAuth';
import { RawAuthentication } from './RawAuth';
import { parseAuthEditor } from './util';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { AssertionErrorCode, AssertionException, format, getIntl } from '@microsoft/logic-apps-shared';
import type { ManagedIdentity } from '@microsoft/logic-apps-shared';
import { useUpdateEffect } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export { AuthenticationOAuthType } from './AADOAuth/AADOAuth';

export const AuthenticationType = {
  NONE: 'None',
  BASIC: 'Basic',
  CERTIFICATE: 'ClientCertificate',
  OAUTH: 'ActiveDirectoryOAuth',
  RAW: 'Raw',
  MSI: 'ManagedServiceIdentity',
} as const;
export type AuthenticationType = (typeof AuthenticationType)[keyof typeof AuthenticationType];

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
}

export const AuthenticationEditor = ({
  type = AuthenticationType.NONE,
  options,
  authenticationValue,
  initialValue,
  getTokenPicker,
  onChange,
  readonly,
  tokenMapping,
  loadParameterValueFromString,
  ...props
}: AuthenticationEditorProps): JSX.Element => {
  const intl = useIntl();
  const [expandedView, setExpandedView] = useState<boolean>(!isTokenValueSegment(initialValue));
  const [collapsedErrorMessage, setCollapsedErrorMessage] = useState('');
  const [option, setOption] = useState<AuthenticationType>(type);
  const [collapsedValue, setCollapsedValue] = useState(initialValue);
  const [currentProps, setCurrentProps] = useState<AuthProps>(authenticationValue);
  const { basic = {}, clientCertificate = {}, raw = {}, msi = {}, aadOAuth = {} } = currentProps;

  const serializeCodeCollapsedValue = (value: ValueSegment[]): void => {
    setCollapsedValue(value);
    onChange?.({
      value: value,
    });
  };

  useUpdateEffect(() => {
    const collapsedValue = parseAuthEditor(option, currentProps);
    setCollapsedValue(collapsedValue);
    onChange?.({ value: collapsedValue, viewModel: { type: option, authenticationValue: currentProps } });
  }, [option, currentProps]);

  const renderAuthentication = () => {
    switch (option) {
      case AuthenticationType.BASIC:
        return (
          <BasicAuthentication
            basicProps={basic}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            readonly={readonly}
            setCurrentProps={setCurrentProps}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
          />
        );
      case AuthenticationType.CERTIFICATE:
        return (
          <CertificateAuthentication
            clientCertificateProps={clientCertificate}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            readonly={readonly}
            setCurrentProps={setCurrentProps}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
          />
        );
      case AuthenticationType.RAW:
        return (
          <RawAuthentication
            rawProps={raw}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            readonly={readonly}
            getTokenPicker={getTokenPicker}
            setCurrentProps={setCurrentProps}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
          />
        );
      case AuthenticationType.MSI:
        return (
          <MSIAuthentication
            identity={options?.identity}
            msiProps={msi}
            readonly={readonly}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            setCurrentProps={setCurrentProps}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
          />
        );
      case AuthenticationType.OAUTH:
        return (
          <ActiveDirectoryAuthentication
            OauthProps={aadOAuth}
            readonly={readonly}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            setCurrentProps={setCurrentProps}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
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
      {expandedView ? (
        <div className="msla-authentication-editor-expanded-container">
          <AuthenticationDropdown
            readonly={readonly}
            dropdownLabel={authenticationTypeLabel}
            selectedKey={option}
            options={getAuthenticationTypes(options.supportedAuthTypes)}
            onChange={handleKeyChange}
          />
          {renderAuthentication()}
        </div>
      ) : (
        <>
          <CollapsedAuthentication
            collapsedValue={collapsedValue}
            setErrorMessage={setCollapsedErrorMessage}
            setCurrentProps={setCurrentProps}
            setOption={setOption}
            serializeValue={serializeCodeCollapsedValue}
            readonly={readonly}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
          />
          <div className="msla-auth-editor-validation">{collapsedErrorMessage}</div>
        </>
      )}
      <div className="msla-authentication-default-view-mode">
        <EditorCollapseToggle
          label={expandedView ? expandedLabel : collapsedLabel}
          collapsed={!expandedView}
          toggleCollapsed={() => setExpandedView(!expandedView)}
          disabled={!expandedView && (isTokenValueSegment(collapsedValue) || collapsedErrorMessage.length > 0)}
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
