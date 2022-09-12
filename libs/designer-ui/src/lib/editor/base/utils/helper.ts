import { AuthenticationType } from '../../..';
import { AUTHENTICATION_PROPERTIES, containsToken, PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE } from '../../../authentication/util';
import type { ValueSegment, TokenType } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { getIntl } from '@microsoft-logic-apps/intl';
import { format } from '@microsoft-logic-apps/utils';
import type { ElementNode } from 'lexical';
import { $getNodeByKey, $isElementNode, $isTextNode } from 'lexical';

export const removeFirstAndLast = (segments: ValueSegment[], removeFirst?: string, removeLast?: string): ValueSegment[] => {
  const n = segments.length - 1;
  segments.forEach((segment, i) => {
    const currentSegment = segment;
    if (currentSegment.type === ValueSegmentType.LITERAL) {
      if (i === 0 && currentSegment.value.charAt(0) === removeFirst) {
        currentSegment.value = currentSegment.value.slice(1);
      } else if (i === n && currentSegment.value.charAt(currentSegment.value.length - 1) === removeLast) {
        currentSegment.value = currentSegment.value.slice(0, -1);
      }
    }
  });
  return segments;
};

export const showCollapsedValidation = (collapsedValue: ValueSegment[]): boolean => {
  return (
    collapsedValue?.length === 1 &&
    (collapsedValue[0].type === ValueSegmentType.TOKEN ||
      (collapsedValue[0].type === ValueSegmentType.LITERAL &&
        collapsedValue[0].value.trim().startsWith('"') &&
        collapsedValue[0].value.trim().endsWith('"')))
  );
};

export const initializeArrayValidation = (initialValue?: ValueSegment[]): boolean => {
  const editorString = initialValue?.map((segment) => segment.value).join('');
  return !editorString || isValidArray(editorString);
};

export const isValidArray = (s: string): boolean => {
  return s.startsWith('[') && s.endsWith(']') && validateArrayStrings(s);
};

export const validateArrayStrings = (s: string): boolean => {
  try {
    JSON.parse(s);
  } catch (e) {
    return false;
  }
  return true;
};

export const initializeDictionaryValidation = (initialValue?: ValueSegment[]): boolean => {
  const editorString = initialValue?.map((segment) => segment.value).join('');
  return !editorString || isValidDictionary(editorString);
};

export const isValidDictionary = (s: string): boolean => {
  return s.startsWith('{') && s.endsWith('}') && validateDictionaryStrings(s);
};

export const validateDictionaryStrings = (s: string): boolean => {
  try {
    JSON.parse(s);
  } catch (e) {
    return false;
  }
  return true;
};

export const isValidAuthentication = (s: string): string => {
  const intl = getIntl();
  const errorMessage = intl.formatMessage({
    defaultMessage: "Invalid json format. Missing beginning '{' or ending '}'",
    description: 'Invalid JSON format',
  });
  if (!s.startsWith('{') || !s.endsWith('}')) {
    return errorMessage;
  }
  return validateAuthenticationString(s);
};

export const validateAuthenticationString = (s: string): string => {
  const intl = getIntl();
  let parsedSerializedValue = Object.create(null);
  try {
    parsedSerializedValue = JSON.parse(s);
  } catch (e) {
    return intl.formatMessage({
      defaultMessage: 'Enter a valid JSON.',
      description: 'Invalid JSON',
    });
  }
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
      return format(
        intl.formatMessage({
          defaultMessage: "Unsupported authentication type '{0}'.",
          description: 'Invalid authentication type',
        }),
        authType
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
  return '';
};

export const getChildrenNodes = (node: ElementNode, nodeMap?: Map<string, ValueSegment>): string => {
  let text = '';
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodes(childNode, nodeMap));
    }
    if ($isTextNode(childNode)) {
      text += childNode.__text.trim();
    } else if ($isTokenNode(childNode)) {
      text += childNode.toString();
      nodeMap?.set(childNode.toString(), childNode.convertToSegment());
    }
    return text;
  });
  return text;
};

export const findChildNode = (node: ElementNode, nodeKey: string, tokenType?: TokenType): ValueSegment | null => {
  let foundNode: ValueSegment | null = null;
  node.__children.find((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      const recurse = findChildNode(childNode, nodeKey, tokenType);
      if (recurse) {
        foundNode = recurse;
      }
    }
    if ($isTokenNode(childNode) && nodeKey === childNode.__key && childNode.__data.token?.tokenType === tokenType) {
      foundNode = childNode.__data;
    }
    return foundNode;
  });
  return foundNode;
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
  for (const key of PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[authType]) {
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
      if (
        (authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD.name) !== -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX.name) !== -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name) !== -1) ||
        (authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD.name) === -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX.name) === -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name) === -1) ||
        (authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name) !== -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PFX.name) !== -1) ||
        (authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_SECRET.name) !== -1 &&
          authenticationKeys.indexOf(AUTHENTICATION_PROPERTIES.AAD_OAUTH_CERTIFICATE_PASSWORD.name) !== -1)
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
        ? format(
            intl.formatMessage({
              defaultMessage: "Missing required property '{0}' for authentication type '{1}'",
              description: 'Error message when missing a required authentication property',
            }),
            missingProperties,
            authType
          )
        : format(
            intl.formatMessage({
              defaultMessage: "Missing required properties '{0}' for authentication type '{1}'",
              description: 'Error message when missing multiple required authentication properties',
            }),
            missingProperties.join(', '),
            authType
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
  const validKeyNames = PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[authType].map((key) => key.name);
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
        ? format(
            intl.formatMessage({
              defaultMessage: "Invalid property '{0}' for authentication type '{1}'.",
              description: 'Error message when having an invalid authentication property',
            }),
            invalidProperties,
            authentication.type
          )
        : format(
            intl.formatMessage({
              defaultMessage: "Invalid properties '{0}' for authentication type '{1}'.",
              description: 'Error message when having multiple invalid authentication properties',
            }),
            invalidProperties.join(', '),
            authentication.type
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
  const validProperties = PROPERTY_NAMES_FOR_AUTHENTICATION_TYPE[authentication.type];
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
        format(
          intl.formatMessage({
            defaultMessage: "Type of '{0}' is '{1}'.",
            description: 'Error message when having invalid authentication property types',
          }),
          authenticationKey,
          currentProperty.type
        )
      );
    }
  }
  return errorMessages.length > 0 ? errorMessages.join(' ') : '';
}
