import type { AuthProps } from '.';
import { AuthenticationType } from '.';
import constants from '../constants';
import { convertItemsToSegments } from '../dictionary/util/deserializecollapseddictionary';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import { convertStringToSegments } from '../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../editor/base/utils/helper';
import { AuthenticationOAuthType } from './AADOAuth/AADOAuth';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { guid, equals, ResourceIdentityType } from '@microsoft-logic-apps/utils';
import { $getRoot } from 'lexical';
import type { LexicalEditor } from 'lexical';

export interface AuthProperty {
  displayName: string;
  name: string;
  isRequired: boolean;
  key: string;
  placeHolder: string;
  type: string;
  format?: string;
}
interface CollapsedAuthEditorItems {
  key: ValueSegment[];
  value: ValueSegment[];
}

const intl = getIntl();

export const AUTHENTICATION_PROPERTIES = {
  AAD_OAUTH_AUDIENCE: {
    displayName: intl.formatMessage({
      defaultMessage: 'Audience',
      description: 'Audience Label Display Name',
    }),
    name: 'audience',
    isRequired: true,
    key: 'aadOAuthAudience',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter audience',
      description: 'Audience Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_AUTHORITY: {
    displayName: intl.formatMessage({
      defaultMessage: 'Authority',
      description: 'Authority Label Display Name',
    }),
    name: 'authority',
    isRequired: false,
    key: 'aadOAuthAuthority',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter authority',
      description: 'Authority Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_CERTIFICATE_PASSWORD: {
    displayName: intl.formatMessage({
      defaultMessage: 'Password',
      description: 'OAuth Password Label Display Name',
    }),
    name: 'password',
    isRequired: true,
    key: 'aadOAuthTypeCertificatePassword',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter password as plain text or use a secure parameter',
      description: 'OAuth Password Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_CERTIFICATE_PFX: {
    displayName: intl.formatMessage({
      defaultMessage: 'Pfx',
      description: 'OAuth Pfx Label Display Name',
    }),
    format: constants.SWAGGER.FORMAT.BYTE,
    name: 'pfx',
    isRequired: true,
    key: 'aadOAuthTypeCertificatePfx',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter Pfx',
      description: 'OAuth Pfx Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_CLIENT_ID: {
    displayName: intl.formatMessage({
      defaultMessage: 'Client ID',
      description: 'Client ID Label Display Name',
    }),
    name: 'clientId',
    isRequired: true,
    key: 'aadOAuthClientId',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter client ID',
      description: 'Client ID Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_SECRET: {
    displayName: intl.formatMessage({
      defaultMessage: 'Secret',
      description: 'Secret Label Display Name',
    }),
    name: 'secret',
    isRequired: true,
    key: 'aadOAuthTypeSecret',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter secret as plain text or use a secure parameter',
      description: 'Secret Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  AAD_OAUTH_TENANT: {
    displayName: intl.formatMessage({
      defaultMessage: 'Tenant',
      description: 'Tenant Label Display Name',
    }),
    name: 'tenant',
    isRequired: true,
    key: 'aadOAuthTenant',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter tenant',
      description: 'Tenant Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  BASIC_USERNAME: {
    displayName: intl.formatMessage({
      defaultMessage: 'Username',
      description: 'Username Label Display Name',
    }),
    name: 'username',
    isRequired: true,
    key: 'basicUsername',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter username',
      description: 'Username Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  BASIC_PASSWORD: {
    displayName: intl.formatMessage({
      defaultMessage: 'Password',
      description: 'Basic Password Label Display Name',
    }),
    name: 'password',
    isRequired: true,
    key: 'basicPassword',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter password as plain text or use a secure parameter',
      description: 'Basic Password Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  SERIALIZED_VALUE: {
    displayName: intl.formatMessage({
      defaultMessage: 'Authentication',
      description: 'Authentication Label Display Name',
    }),
    name: '',
    isRequired: false,
    key: 'serializedValue',
    placeHolder: '',
    type: constants.SWAGGER.TYPE.STRING,
  },

  CLIENT_CERTIFICATE_PASSWORD: {
    displayName: intl.formatMessage({
      defaultMessage: 'Password',
      description: 'Client Certificate Password Label Display Name',
    }),
    name: 'password',
    isRequired: false,
    key: 'clientCertificatePassword',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter password as plain text or use a secure parameter',
      description: 'Client Certificate Password Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  CLIENT_CERTIFICATE_PFX: {
    displayName: intl.formatMessage({
      defaultMessage: 'Pfx',
      description: 'Client Certificate Pfx Label Display Name',
    }),
    format: constants.SWAGGER.FORMAT.BYTE,
    name: 'pfx',
    isRequired: true,
    key: 'clientCertificatePfx',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter Pfx',
      description: 'Client Certificate Pfx Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  MSI_AUDIENCE: {
    displayName: intl.formatMessage({
      defaultMessage: 'Audience',
      description: 'MSI Audience Label Display Name',
    }),
    name: 'audience',
    isRequired: false,
    key: 'msiAudience',
    // TODO: Replace audience placeholder specific to environment (public azure, fairfax, mooncake)
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter audience',
      description: 'MSI Audience Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  MSI_IDENTITY: {
    displayName: intl.formatMessage({
      defaultMessage: 'Managed identity',
      description: 'Managed Identity Label Display Name',
    }),
    name: 'identity',
    isRequired: true,
    key: 'identity',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Please select an identity',
      description: 'MSI Identity Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  RAW_VALUE: {
    displayName: intl.formatMessage({
      defaultMessage: 'Value',
      description: 'Raw Value Label Display Name',
    }),
    name: 'value',
    isRequired: true,
    key: 'rawValue',
    placeHolder: intl.formatMessage({
      defaultMessage: 'Enter the value of the Authorization header',
      description: 'Raw Value Placeholder Text',
    }),
    type: constants.SWAGGER.TYPE.STRING,
  },

  TYPE: {
    displayName: '',
    name: 'type',
    isRequired: true,
    key: 'authType',
    placeHolder: '',
    type: constants.SWAGGER.TYPE.STRING,
  },
};

export const PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE: Record<string, AuthProperty[]> = {
  Basic: [AUTHENTICATION_PROPERTIES.BASIC_USERNAME, AUTHENTICATION_PROPERTIES.BASIC_PASSWORD],
  'Client Certificate': [AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX, AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD],
  'Active Directory OAuth': [
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_TENANT,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUDIENCE,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUTHORITY,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_CLIENT_ID,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX,
    AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD,
  ],
  Raw: [AUTHENTICATION_PROPERTIES.RAW_VALUE],
  'Managed Identity': [AUTHENTICATION_PROPERTIES.MSI_AUDIENCE, AUTHENTICATION_PROPERTIES.MSI_IDENTITY],
  None: [],
};

/**
 * Checks if the identity is valid and contains a user assigned identities.
 * @param {ManagedIdentity} identity - The managed identity.
 * @return {boolean} - If the managed identity contains a user assigned identity or not.
 */
export function containsUserAssignedIdentities(identity: ManagedIdentity): boolean {
  return (
    identity &&
    !!identity.type &&
    (equals(identity.type, ResourceIdentityType.USER_ASSIGNED) ||
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) &&
    !!identity.userAssignedIdentities &&
    Object.keys(identity.userAssignedIdentities).length > 0
  );
}

/**
 * Converts AuthEditor Props into ValueSegment Array for the Collpased Authentication Editor.
 * @param {AuthenticationType} authType - The Authority Type.
 * @param {AuthProps} items - Authority Props.
 * @return {ValueSegment[]} - Collapsed ValueSegment Array.
 */
export function parseAuthEditor(authType: AuthenticationType, items: AuthProps): ValueSegment[] {
  const values: CollapsedAuthEditorItems[] = [];
  switch (authType) {
    case AuthenticationType.BASIC:
      updateValues(values, AUTHENTICATION_PROPERTIES.BASIC_USERNAME, items.basicProps?.basicUsername);
      updateValues(values, AUTHENTICATION_PROPERTIES.BASIC_PASSWORD, items.basicProps?.basicPassword);
      break;
    case AuthenticationType.CERTIFICATE:
      updateValues(values, AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX, items.clientCertificateProps?.clientCertificatePfx);
      updateValues(values, AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD, items.clientCertificateProps?.clientCertificatePassword);
      break;
    case AuthenticationType.RAW:
      updateValues(values, AUTHENTICATION_PROPERTIES.RAW_VALUE, items.rawProps?.rawValue);
      break;
    case AuthenticationType.MSI:
      updateValues(values, AUTHENTICATION_PROPERTIES.MSI_AUDIENCE, items.msiProps?.MSIAudience);
      break;
    case AuthenticationType.OAUTH:
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUTHORITY, items.aadOAuthProps?.OAuthAuthority);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_TENANT, items.aadOAuthProps?.OAuthTenant);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUDIENCE, items.aadOAuthProps?.OAuthAudience);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CLIENT_ID, items.aadOAuthProps?.OAuthClientId);
      if (items.aadOAuthProps?.OAuthType === AuthenticationOAuthType.CERTIFICATE) {
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX, items.aadOAuthProps?.OAuthTypeCertificatePfx);
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD, items.aadOAuthProps?.OAuthTypeCertificatePassword);
      } else {
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET, items.aadOAuthProps?.OAuthTypeSecret);
      }
      break;
  }
  const currentItems: CollapsedAuthEditorItems[] = [
    {
      key: [{ type: ValueSegmentType.LITERAL, id: guid(), value: AUTHENTICATION_PROPERTIES.TYPE.name }],
      value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: authType }],
    },
    ...values,
  ];

  return convertItemsToSegments(currentItems);
}

const updateValues = (values: CollapsedAuthEditorItems[], property: AuthProperty, val?: ValueSegment[]) => {
  if (property.isRequired || (val && val.length > 0)) {
    values.push({
      key: [{ type: ValueSegmentType.LITERAL, id: guid(), value: property.name }],
      value: val ?? [{ type: ValueSegmentType.LITERAL, id: guid(), value: '' }],
    });
  }
};

export const serializeAuthentication = (
  editor: LexicalEditor,
  setCurrentProps: (items: AuthProps) => void,
  setOption: (s: string) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }
    const returnItems: AuthProps = {};
    setOption(jsonEditor['type'] as string);
    switch (jsonEditor['type']) {
      case AuthenticationType.BASIC:
        returnItems.basicProps = {
          basicUsername: convertStringToSegments(jsonEditor['username'], true, nodeMap),
          basicPassword: convertStringToSegments(jsonEditor['password'], true, nodeMap),
        };
        break;
      case AuthenticationType.CERTIFICATE:
        returnItems.clientCertificateProps = {
          clientCertificatePfx: convertStringToSegments(jsonEditor['pfx'], true, nodeMap),
          clientCertificatePassword: convertStringToSegments(jsonEditor['password'], true, nodeMap),
        };
        break;
      case AuthenticationType.RAW:
        returnItems.rawProps = {
          rawValue: convertStringToSegments(jsonEditor['value'], true, nodeMap),
        };
        break;
      case AuthenticationType.MSI:
        returnItems.msiProps = {
          MSIAudience: convertStringToSegments(jsonEditor['audience'], true, nodeMap),
        };
        break;
      case AuthenticationType.OAUTH:
        returnItems.aadOAuthProps = {
          OAuthTenant: convertStringToSegments(jsonEditor['tenant'], true, nodeMap),
          OAuthAudience: convertStringToSegments(jsonEditor['audience'], true, nodeMap),
          OAuthClientId: convertStringToSegments(jsonEditor['clientId'], true, nodeMap),
        };
        if (jsonEditor['authority']) {
          returnItems.aadOAuthProps.OAuthAuthority = convertStringToSegments(jsonEditor['authority'], true, nodeMap);
        }
        if (jsonEditor['secret']) {
          returnItems.aadOAuthProps.OAuthTypeSecret = convertStringToSegments(jsonEditor['secret'], true, nodeMap);
        }
        if (jsonEditor['pfx'] && jsonEditor['password']) {
          returnItems.aadOAuthProps.OAuthTypeCertificatePfx = convertStringToSegments(jsonEditor['pfx'], true, nodeMap);
          returnItems.aadOAuthProps.OAuthTypeCertificatePassword = convertStringToSegments(jsonEditor['password'], true, nodeMap);
        }
        break;
    }
    setCurrentProps(returnItems);
  });
};

export function containsToken(value: string): boolean {
  if (value.indexOf('$[') !== -1 && value.indexOf(']$') !== -1) {
    return true;
  } else {
    return false;
  }
}
