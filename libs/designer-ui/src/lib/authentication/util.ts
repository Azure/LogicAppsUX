import constants from '../constants';
import { getIntl } from '@microsoft-logic-apps/intl';

export interface AuthProperty {
  displayName: string;
  name: string;
  isRequired: boolean;
  key: string;
  placeHolder: string;
  type: string;
  format?: string;
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
