import { mergeClasses } from '@fluentui/react-components';
import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { isTokenValueSegment, notEqual } from '../editor/base/utils/helper';
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
  onChange,
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
    if (notEqual(value, initialValue)) {
      onChange?.({
        value: value,
      });
    }
  };

  useUpdateEffect(() => {
    const collapsedValue = parseAuthEditor(option, currentProps);
    setCollapsedValue(collapsedValue);

    if (notEqual(collapsedValue, initialValue)) {
      onChange?.({ value: collapsedValue, viewModel: { type: option, authenticationValue: currentProps } });
    }
  }, [option, currentProps]);

  const renderAuthentication = () => {
    switch (option) {
      case AuthenticationType.BASIC:
        return (
          <BasicAuthentication
            {...props}
            basicProps={basic}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.CERTIFICATE:
        return (
          <CertificateAuthentication
            {...props}
            clientCertificateProps={clientCertificate}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.RAW:
        return (
          <RawAuthentication
            {...props}
            rawProps={raw}
            tokenPickerButtonProps={props.tokenPickerButtonProps}
            setCurrentProps={setCurrentProps}
          />
        );
      case AuthenticationType.MSI:
        return <MSIAuthentication {...props} identity={options?.identity} msiProps={msi} setCurrentProps={setCurrentProps} />;
      case AuthenticationType.OAUTH:
        return <ActiveDirectoryAuthentication {...props} OauthProps={aadOAuth} setCurrentProps={setCurrentProps} />;
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
    defaultMessage: 'Authentication type',
    id: 'CeF40t',
    description: 'Label for Authentication Type dropdown',
  });

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to code view mode',
    id: '8LhQeL',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to default view mode',
    id: 'qij+Vf',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  return (
    <div className={mergeClasses('msla-authentication-editor-container', props.className)}>
      {expandedView ? (
        <div className="msla-authentication-editor-expanded-container">
          <AuthenticationDropdown
            readonly={props.readonly}
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
            {...props}
            collapsedValue={collapsedValue}
            setErrorMessage={setCollapsedErrorMessage}
            setCurrentProps={setCurrentProps}
            setOption={setOption}
            serializeValue={serializeCodeCollapsedValue}
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
          text: intl.formatMessage({ defaultMessage: 'Basic', id: 'tUlRzr', description: 'Authentication type' }),
        };
      case AuthenticationType.CERTIFICATE:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Client certificate', id: 'eLthgv', description: 'Authentication type' }),
        };

      case AuthenticationType.OAUTH:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Active Directory OAuth', id: 'n4V2Hi', description: 'Authentication type' }),
        };

      case AuthenticationType.RAW:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Raw', id: 'Tayrub', description: 'Authentication type' }),
        };

      case AuthenticationType.MSI:
        return {
          key: type,
          text: intl.formatMessage({ defaultMessage: 'Managed identity', id: 'aurgrg', description: 'Authentication type' }),
        };

      default:
        return { key: type, text: type };
    }
  });
};
