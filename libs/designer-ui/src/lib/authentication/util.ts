import type { AuthProps } from '.';
import { AuthenticationType } from '.';
import constants from '../constants';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import { convertStringToSegments } from '../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../editor/base/utils/helper';
import { convertKeyValueItemToSegments } from '../editor/base/utils/keyvalueitem';
import { AuthenticationOAuthType } from './AADOAuth/AADOAuth';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { ManagedIdentity } from '@microsoft/utils-logic-apps';
import { guid, equals, ResourceIdentityType } from '@microsoft/utils-logic-apps';
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
  id: string;
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
      defaultMessage: 'Enter the audience.',
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
      description: 'Username placeholder text',
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
      defaultMessage: 'Enter the audience.',
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
export function containsUserAssignedIdentities(identity: ManagedIdentity | undefined): boolean {
  return (
    !!identity &&
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
      updateValues(values, AUTHENTICATION_PROPERTIES.BASIC_USERNAME, items.basic?.basicUsername);
      updateValues(values, AUTHENTICATION_PROPERTIES.BASIC_PASSWORD, items.basic?.basicPassword);
      break;
    case AuthenticationType.CERTIFICATE:
      updateValues(values, AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PFX, items.clientCertificate?.clientCertificatePfx);
      updateValues(values, AUTHENTICATION_PROPERTIES.CLIENT_CERTIFICATE_PASSWORD, items.clientCertificate?.clientCertificatePassword);
      break;
    case AuthenticationType.RAW:
      updateValues(values, AUTHENTICATION_PROPERTIES.RAW_VALUE, items.raw?.rawValue);
      break;
    case AuthenticationType.MSI:
      if (items.msi?.msiIdentity) {
        updateValues(values, AUTHENTICATION_PROPERTIES.MSI_IDENTITY, [
          { id: guid(), type: ValueSegmentType.LITERAL, value: items.msi.msiIdentity },
        ]);
      }

      updateValues(values, AUTHENTICATION_PROPERTIES.MSI_AUDIENCE, items.msi?.msiAudience);
      break;
    case AuthenticationType.OAUTH:
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUTHORITY, items.aadOAuth?.oauthAuthority);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_TENANT, items.aadOAuth?.oauthTenant);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_AUDIENCE, items.aadOAuth?.oauthAudience);
      updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CLIENT_ID, items.aadOAuth?.oauthClientId);
      if (items.aadOAuth?.oauthType === AuthenticationOAuthType.CERTIFICATE) {
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX, items.aadOAuth?.oauthTypeCertificatePfx);
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD, items.aadOAuth?.oauthTypeCertificatePassword);
      } else {
        updateValues(values, AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET, items.aadOAuth?.oauthTypeSecret);
      }
      break;
  }
  const currentItems: CollapsedAuthEditorItems[] = [
    {
      key: [{ type: ValueSegmentType.LITERAL, id: guid(), value: AUTHENTICATION_PROPERTIES.TYPE.name }],
      value: [{ type: ValueSegmentType.LITERAL, id: guid(), value: authType }],
      id: guid(),
    },
    ...values,
  ];

  return convertKeyValueItemToSegments(currentItems, constants.SWAGGER.TYPE.STRING, constants.SWAGGER.TYPE.STRING);
}

const updateValues = (values: CollapsedAuthEditorItems[], property: AuthProperty, val?: ValueSegment[]) => {
  if (property.isRequired || (val && val.length > 0)) {
    values.push({
      key: [{ type: ValueSegmentType.LITERAL, id: guid(), value: property.name }],
      value: val ?? [{ type: ValueSegmentType.LITERAL, id: guid(), value: '' }],
      id: guid(),
    });
  }
};

export const serializeAuthentication = (
  editor: LexicalEditor,
  setCurrentProps: (items: AuthProps) => void,
  setOption: (s: AuthenticationType) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor = Object.create(null);
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      throw new Error(`Invalid Authentication value. ${e}`);
    }
    const returnItems: AuthProps = {};
    setOption(jsonEditor.type);
    switch (jsonEditor.type) {
      case AuthenticationType.BASIC:
        returnItems.basic = {
          basicUsername: convertStringToSegments(jsonEditor.username, true, nodeMap),
          basicPassword: convertStringToSegments(jsonEditor.password, true, nodeMap),
        };
        break;
      case AuthenticationType.CERTIFICATE:
        returnItems.clientCertificate = {
          clientCertificatePfx: convertStringToSegments(jsonEditor.pfx, true, nodeMap),
          clientCertificatePassword: convertStringToSegments(jsonEditor.password, true, nodeMap),
        };
        break;
      case AuthenticationType.RAW:
        returnItems.raw = {
          rawValue: convertStringToSegments(jsonEditor.value, true, nodeMap),
        };
        break;
      case AuthenticationType.MSI:
        returnItems.msi = {
          msiIdentity: jsonEditor.identity,
          msiAudience: convertStringToSegments(jsonEditor.audience, true, nodeMap),
        };
        break;
      case AuthenticationType.OAUTH:
        returnItems.aadOAuth = {
          oauthTenant: convertStringToSegments(jsonEditor.tenant, true, nodeMap),
          oauthAudience: convertStringToSegments(jsonEditor.audience, true, nodeMap),
          oauthClientId: convertStringToSegments(jsonEditor.clientId, true, nodeMap),
        };
        if (jsonEditor.authority) {
          returnItems.aadOAuth.oauthAuthority = convertStringToSegments(jsonEditor.authority, true, nodeMap);
        }
        if (jsonEditor.secret) {
          returnItems.aadOAuth.oauthType = AuthenticationOAuthType.SECRET;
          returnItems.aadOAuth.oauthTypeSecret = convertStringToSegments(jsonEditor.secret, true, nodeMap);
        }
        if (jsonEditor.pfx && jsonEditor.password) {
          returnItems.aadOAuth.oauthType = AuthenticationOAuthType.CERTIFICATE;
          returnItems.aadOAuth.oauthTypeCertificatePfx = convertStringToSegments(jsonEditor.pfx, true, nodeMap);
          returnItems.aadOAuth.oauthTypeCertificatePassword = convertStringToSegments(jsonEditor.password, true, nodeMap);
        }
        break;
    }
    setCurrentProps(returnItems);
  });
};

export function containsToken(value: string): boolean {
  if (value.indexOf('@{') !== -1 && value.indexOf('}') !== -1) {
    return true;
  } else {
    return false;
  }
}

export const validateAuthentication = (s: string, setErrorMessage: (s: string) => void): string => {
  const intl = getIntl();
  const invalidJsonErrorMessage = intl.formatMessage(
    {
      defaultMessage: 'Invalid json format. Missing beginning {openingBracket} or ending {closingBracket}.',
      description: 'Invalid JSON format',
    },
    {
      openingBracket: '{',
      closingBracket: '}',
    }
  );
  if (!(s.startsWith('{') && s.endsWith('}'))) {
    setErrorMessage(invalidJsonErrorMessage);
    return invalidJsonErrorMessage;
  }
  const errorMessage = validateAuthenticationString(s);
  if (errorMessage) {
    setErrorMessage(errorMessage);
    return errorMessage;
  }
  return '';
};

export const validateAuthenticationString = (s: string): string => {
  const intl = getIntl();
  let parsedSerializedValue = Object.create(null);
  try {
    parsedSerializedValue = JSON.parse(s);
    if (parsedSerializedValue.type === undefined) {
      return intl.formatMessage({
        defaultMessage: "Missing authentication type property: 'type'.",
        description: 'Invalid authentication without type property',
      });
    } else {
      const authType = parsedSerializedValue.type;
      if (!Object.values(AuthenticationType).find((val) => authType === val)) {
        if (containsToken(authType)) {
          return intl.formatMessage({
            defaultMessage: "Missing authentication type property: 'type'.",
            description: 'Invalid authentication without type property',
          });
        }
        return intl.formatMessage(
          {
            defaultMessage: "Unsupported authentication type ''{authType}''.",
            description: 'Invalid authentication type',
          },
          { authType }
        );
      } else {
        let errorMessage = checkForMissingOrInvalidProperties(parsedSerializedValue, authType);
        if (errorMessage) {
          return errorMessage;
        }
        errorMessage = checkForUnknownProperties(parsedSerializedValue, authType);
        if (errorMessage) {
          return errorMessage;
        }
        errorMessage = checkForInvalidValues(parsedSerializedValue);
        if (errorMessage) {
          return errorMessage;
        }
      }
    }
  } catch {
    return intl.formatMessage({
      defaultMessage: 'Enter a valid JSON.',
      description: 'Invalid JSON',
    });
  }

  return '';
};

const authTypeConversion = (s: string): string => {
  if (s === AuthenticationType.CERTIFICATE) {
    return 'Client Certificate';
  } else if (s === AuthenticationType.MSI) {
    return 'Managed Service Identity';
  } else if (s === AuthenticationType.OAUTH) {
    return 'Active Directory OAuth';
  }
  return s;
};

/**
 * Checks if any required property is missing.
 * @arg {any} authentication -  The parsed authentication value.
 * @arg {AuthenticationType} authType -  The authentication type.
 * @return {string} - The error message for missing a required property.
 */
function checkForMissingOrInvalidProperties(authentication: any, authType: AuthenticationType): string {
  const intl = getIntl();
  let missingProperties: string[] = [];
  const convertedAuthType = authTypeConversion(authType);
  for (const key of PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[convertedAuthType]) {
    if (key.isRequired && authentication[key.name] === undefined) {
      missingProperties.push(key.name);
    }
  }
  missingProperties = missingProperties.filter((name) => name !== AUTHENTICATION_PROPERTIES.MSI_IDENTITY.name);

  if (authType === AuthenticationType.OAUTH) {
    missingProperties = missingProperties.filter(
      (name) =>
        name !== AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX.name &&
        name !== AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD.name &&
        name !== AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name
    );
    if (missingProperties.length === 0) {
      const authenticationKeys = Object.keys(authentication);
      const hasPassword = authenticationKeys.includes(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD.name);
      const hasPfx = authenticationKeys.includes(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX.name);
      const hasSecret = authenticationKeys.includes(AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name);
      if (
        (hasPassword && hasPfx && hasSecret) ||
        (!hasPassword && !hasPfx && !hasSecret) ||
        (hasSecret && hasPfx) ||
        (hasSecret && hasPassword)
      ) {
        return intl.formatMessage({
          defaultMessage: "Missing required properties 'secret' or 'pfx' and 'password' for authentication type 'ActiveDirectoryOAuth'.",
          description: 'OAuth Error message when missing properties',
        });
      }
    }
  }
  if (missingProperties.length > 0) {
    const errorMessage =
      missingProperties.length === 1
        ? intl.formatMessage(
            {
              defaultMessage: "Missing required property ''{missingProperties}'' for authentication type ''{convertedAuthType}''",
              description: 'Error message when missing a required authentication property',
            },
            { missingProperties: missingProperties[0], convertedAuthType }
          )
        : intl.formatMessage(
            {
              defaultMessage: "Missing required properties ''{missingProperties}'' for authentication type ''{convertedAuthType}''",
              description: 'Error message when missing multiple required authentication properties',
            },
            { missingProperties: missingProperties.join(', '), convertedAuthType }
          );

    return errorMessage;
  } else {
    return '';
  }
}

/**
 * Checks if any required property is missing.
 * @arg {any} authentication -  The parsed authentication value.
 * @arg {AuthenticationType} authType -  The authentication type.
 * @return {string} - The error message for having an unknown property.
 */
function checkForUnknownProperties(authentication: any, authType: AuthenticationType): string {
  const intl = getIntl();
  const convertedAuthType = authTypeConversion(authType);
  const validKeyNames = PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[convertedAuthType].map((key) => key.name);
  const authenticationKeys = Object.keys(authentication);
  const invalidProperties: string[] = [];

  for (const authenticationKey of authenticationKeys) {
    if (containsToken(authenticationKey)) {
      return intl.formatMessage({
        defaultMessage: 'Dynamic content not supported as properties in authentication.',
        description: 'Error message for when putting token in authentication property',
      });
    }
    if (authenticationKey !== AUTHENTICATION_PROPERTIES.TYPE.name && validKeyNames.indexOf(authenticationKey) === -1) {
      invalidProperties.push(authenticationKey);
    }
  }
  if (invalidProperties.length > 0) {
    const errorMessage =
      invalidProperties.length === 1
        ? intl.formatMessage(
            {
              defaultMessage: "Invalid property ''{invalidProperties}'' for authentication type ''{convertedAuthType}''.",
              description: 'Error message when having an invalid authentication property',
            },
            { invalidProperties: invalidProperties[0], convertedAuthType }
          )
        : intl.formatMessage(
            {
              defaultMessage: "The ''{invalidProperties}'' properties are invalid for the ''{convertedAuthType}'' authentication type.",
              description: 'Error message when having multiple invalid authentication properties',
            },
            { invalidProperties: invalidProperties.join(', '), convertedAuthType }
          );

    return errorMessage;
  } else {
    return '';
  }
}

/**
 * Checks if value contains a property with invalid value.
 * @arg {any} authentication -  The parsed authentication value.
 * @return {string} - The error message for having a property with invalid values.
 */
function checkForInvalidValues(authentication: any): string {
  const intl = getIntl();
  const convertedAuthType = authTypeConversion(authentication.type);
  const validProperties = PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[convertedAuthType];
  const errorMessages: string[] = [];
  const authenticationKeys = Object.keys(authentication);
  for (const authenticationKey of authenticationKeys) {
    if (
      authenticationKey === AUTHENTICATION_PROPERTIES.TYPE.name ||
      authenticationKey === AUTHENTICATION_PROPERTIES.MSI_IDENTITY.name ||
      containsToken(authentication[authenticationKey].toString())
    ) {
      continue;
    }
    const currentProperty = validProperties.filter((validProperty) => validProperty.name === authenticationKey)[0];
    if (authentication[authenticationKey] !== '' && currentProperty.type !== typeof authentication[authenticationKey]) {
      errorMessages.push(
        intl.formatMessage(
          {
            defaultMessage: "The type for ''{authenticationKey}'' is ''{propertyType}''.",
            description: 'Error message when having invalid authentication property types',
          },
          { authenticationKey, propertyType: currentProperty.type }
        )
      );
    }
  }
  return errorMessages.length > 0 ? errorMessages.join(' ') : '';
}
