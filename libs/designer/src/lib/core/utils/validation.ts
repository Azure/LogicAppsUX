import Constants from '../../common/constants';
import { getTitleOrSummary } from './openapi/schema';
import { isParameterRequired, parameterValueToJSONString, recurseSerializeCondition } from './parameters/helper';
import { isTokenValueSegment } from './parameters/segment';
import type { ParameterInfo, ValueSegment } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Expression, ExpressionLiteral } from '@microsoft/parsers-logic-apps';
import {
  ExpressionParser,
  ExpressionType,
  isStringInterpolation,
  isStringLiteral,
  isTemplateExpression,
} from '@microsoft/parsers-logic-apps';
import { endsWith, equals, startsWith } from '@microsoft/utils-logic-apps';

const regex = {
  datetime:
    /^(\d{4})-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])(?:[\sT])([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d|60))?(\.\d+)?(([Zz])|([+|-]([01]\d|2[0-3])))?$/,
  double: /^(?:[-+])?([0-9]*(\.[0-9]+([eE](?:[-+])[0-9]+)?)?)$/,
  email:
    // eslint-disable-next-line no-empty-character-class
    /^([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([!#-'*+/-9=?A-Z^-~-]+(\.[!#-'*+/-9=?A-Z^-~-]+)*|\[[\t -Z^-~]*])$/,
  integer: /^(?:[-+])?([0-9]+)$/,
  phone: /^(\+)?(?:[0-9]{5,15})$/,
  url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))?)(?::\d{2,5})?(?:\/\S*)?$/i,
  zipcode: /^[0-9]{5}$/,
  zipcode4: /^[0-9]{5}(?:-[0-9]{4})$/,
};

/**
 * Checks that the entered expression meets requirements for the parameter specified by its type, format, and pattern
 * @arg {ParameterInfo} parameterMetadata - The metadata of the parameter as described by its swagger
 * @arg {string} parameterValue - The current value of the expression entered for the parameter
 * @arg {string} shouldValidateUnknownParameterAsError - Flag indicating whether to consider unknown parameters as errors
 * @return {string[]} - An array of strings with validation error messages, if there are any
 */
export function validateStaticParameterInfo(
  parameterMetadata: ParameterInfo,
  parameterValue: string,
  shouldValidateUnknownParameterAsError: boolean
): string[] {
  const intl = getIntl();

  const parameterTitle = getTitleOrSummary(parameterMetadata.schema) || parameterMetadata.parameterName;
  const parameterFormat = parameterMetadata.info.format,
    parameterName = formatParameterName(parameterTitle),
    pattern = parameterMetadata.pattern,
    type = parameterMetadata.type,
    required = isParameterRequired(parameterMetadata),
    parameterErrorMessages: string[] = [],
    typeError = validateType(type, parameterFormat ?? '', parameterValue),
    isUnknown = parameterMetadata.info.isUnknown;

  if (typeError) {
    parameterErrorMessages.push(typeError);
  }

  if (pattern && !new RegExp(pattern).test(parameterValue)) {
    parameterErrorMessages.push(
      intl.formatMessage(
        { defaultMessage: 'Enter a valid value for {parameterName}.', description: 'Invalid Pattern error message' },
        { parameterName }
      )
    );
  }

  if (required && !parameterValue) {
    parameterErrorMessages.push(
      intl.formatMessage(
        { defaultMessage: '{parameterName} is required.', description: 'Required Parameter error message' },
        { parameterName }
      )
    );
  }

  if (shouldValidateUnknownParameterAsError && isUnknown && parameterValue) {
    parameterErrorMessages.push(
      intl.formatMessage(
        {
          defaultMessage:
            '{parameterName} is no longer present in the operation schema. It should be removed before the workflow is re-saved.',
          description: 'Unknown Parameter error message',
        },
        { parameterName }
      )
    );
  }

  return parameterErrorMessages;
}

/**
 * @arg {string} type - The type of the parameter.
 * @arg {string} parameterFormat - The format of the parameter.
 * @arg {string} parameterValue - The stringified parameter value.
 * @return {string}
 */
export function validateType(type: string, parameterFormat: string, parameterValue: string): string | undefined {
  if (!parameterValue) {
    return;
  }
  const isExpression = isTemplateExpression(parameterValue.toString());
  const intl = getIntl();

  switch (type.toLowerCase()) {
    case Constants.SWAGGER.TYPE.INTEGER:
      if (isExpression) {
        return;
      }
      if (!regex.integer.test(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid integer.', description: 'Error validation message' });
      }
      return validateIntegerFormat(parameterFormat, parameterValue);

    case Constants.SWAGGER.TYPE.NUMBER:
      if (isExpression) {
        return;
      }
      if (isNaN(Number(parameterValue))) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid number.', description: 'Error validation message' });
      }
      return validateNumberFormat(parameterFormat, parameterValue);

    case Constants.SWAGGER.TYPE.BOOLEAN:
      if (isExpression) {
        return;
      }
      if (!(equals(parameterValue, 'true') || equals(parameterValue, 'false') || !parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid boolean.', description: 'Error validation message' });
      }
      return;

    case Constants.SWAGGER.TYPE.OBJECT:
      if (isExpression) {
        return;
      }
      if (!isValidJSONObjectFormat(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid json.', description: 'Error validation message' });
      }
      return;

    case Constants.SWAGGER.TYPE.ARRAY:
      if (isExpression) {
        return;
      }
      if (!isValidArrayFormat(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid array.', description: 'Error validation message for the array type' });
      }
      return;
    case Constants.SWAGGER.TYPE.STRING:
      return validateStringFormat(parameterFormat, parameterValue, isExpression);

    default:
      return;
  }
}

function validateIntegerFormat(parameterFormat: string, parameterValue: string): string {
  if (!parameterFormat) {
    return '';
  }

  if (parameterFormat.toLowerCase() === 'int32') {
    if (Number(parameterValue) > Constants.INT_MAX || Number(parameterValue) < Constants.INT_MIN) {
      return getIntl().formatMessage({ defaultMessage: 'The value is too large.', description: 'Error validation message' });
    }
  }

  return '';
}

function validateNumberFormat(parameterFormat: string, parameterValue: string): string {
  if (!parameterFormat) {
    return '';
  }

  const intl = getIntl();
  switch (parameterFormat.toLowerCase()) {
    case Constants.SWAGGER.FORMAT.DOUBLE:
      if (!regex.double.test(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid Double number.', description: 'Error validation message' });
      }
      break;

    case Constants.SWAGGER.FORMAT.FLOAT:
      if (!regex.double.test(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid float.', description: 'Error validation message' });
      }
      break;

    default:
      return '';
  }

  return '';
}

function validateStringFormat(parameterFormat: string, parameterValue: string, isTemplateExpression: boolean): string {
  if (!parameterFormat) {
    return '';
  }

  const intl = getIntl();
  switch (parameterFormat.toLowerCase()) {
    case 'datetime':
    case Constants.SWAGGER.FORMAT.DATETIME:
      if (isTemplateExpression) {
        return '';
      }
      // RFC 3339
      if (isNaN(Date.parse(parameterValue)) || !regex.datetime.test(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid datetime.', description: 'Error validation message' });
      }
      break;

    case Constants.SWAGGER.FORMAT.EMAIL:
      // RFC 5322
      // Support validating multiple emails separated by ;
      if (isTemplateExpression) {
        try {
          return validateEmailLiteralsFromExpression(parameterValue);
        } catch {
          // NOTE: Parser throws exceptions when invalid emails are entered,
          // switch to normal validation in such cases.
          return validateStringEmails(parameterValue);
        }
      } else {
        return validateStringEmails(parameterValue);
      }

    case Constants.SWAGGER.FORMAT.URI:
      if (isTemplateExpression) {
        return '';
      }

      if (!regex.url.test(parameterValue)) {
        return intl.formatMessage({ defaultMessage: 'Enter a valid uri.', description: 'Error validation message' });
      }
      break;

    default:
      break;
  }

  return '';
}

/**
 * @arg {ParameterInfo} parameterMetadata - An object with metadata describing a parameter
 * @arg {ValueSegment[]} parameterValue - An array of valuesegments from a parameter value to validate
 * @return {string[]} - An array of validation error messages, if there are any
 */
export function validateJSONParameter(parameterMetadata: ParameterInfo, parameterValue: ValueSegment[]): string[] {
  const intl = getIntl();
  const { editor, editorOptions } = parameterMetadata;
  const isConditionEditor = editor === Constants.EDITOR.CONDITION && !editorOptions?.isOldFormat;
  const value = isConditionEditor
    ? JSON.stringify(recurseSerializeCondition(parameterMetadata, parameterMetadata.editorViewModel.items, true))
    : parameterValueToJSONString(parameterValue, false, true);

  const errors: string[] = [];
  const parameterTitle = getTitleOrSummary(parameterMetadata.schema) || parameterMetadata.parameterName;
  const parameterName = formatParameterName(parameterTitle);
  const required = isParameterRequired(parameterMetadata);
  if (required && !value) {
    return [
      intl.formatMessage(
        { defaultMessage: '{parameterName} is required.', description: 'Required Parameter error message' },
        { parameterName }
      ),
    ];
  }

  if (shouldValidateJSON(parameterValue) && value) {
    try {
      JSON.parse(value);
      if (isConditionEditor) {
        validateConditionalEditor(value, errors);
      }
    } catch {
      if (!parameterHasOnlyTokenBinding(parameterValue)) {
        errors.push(
          intl.formatMessage({
            defaultMessage: 'Enter a valid JSON.',
            description: 'Invalid JSON',
          })
        );
      }
    }
  }

  return errors;
}

const validateConditionalEditor = (value: string, errors: string[]) => {
  const intl = getIntl();
  let index = value.indexOf('null');
  const indices = [];
  while (index !== -1) {
    indices.push(index);
    index = value.indexOf('null', index + 1);
  }

  for (let i = 0; i < indices.length; i++) {
    if (value[indices[i] - 1] === '@' || (value.substring(indices[i] - 2, indices[i]) === '@{' && value[indices[i] + 4] === '}')) {
      continue;
    } else {
      errors.push(
        intl.formatMessage({
          defaultMessage: 'Enter a valid condition.',
          description: 'Invalid condition',
        })
      );
      return;
    }
  }
};

function shouldValidateJSON(expressions: ValueSegment[]): boolean {
  const shouldValidate = true;

  if (shouldValidate && expressions.length) {
    const firstSegmentValue = expressions[0].token?.value;
    if (firstSegmentValue) {
      return startsWith(firstSegmentValue, '@@') || startsWith(firstSegmentValue, '@{') || !startsWith(firstSegmentValue, '@');
    }
  }

  return shouldValidate;
}

export function parameterHasOnlyTokenBinding(parameterValue: ValueSegment[]): boolean {
  const trimmedValue = trimParameterValue(parameterValue);
  return trimmedValue.length === 1 && isTokenValueSegment(trimmedValue[0]);
}

/**
 * Removes empty segments that are part of a parameter value, which might exist between tokens or at the end of the value.
 * @arg {ValueSegment[]} value - The parameter value.
 * @return {ValueSegment[]} - The trimmed value.
 */
export function trimParameterValue(value: ValueSegment[]): ValueSegment[] {
  return (value || []).filter((segment) => segment.token?.value !== '');
}

function validateEmailLiteralsFromExpression(expressionString: string): string {
  const emailfields: Expression[][] = [];
  let currentField = 0;
  emailfields[currentField] = [];

  // NOTE: Parse expression and split into an array of expression groups, each group make up the expression for an email.
  // Example: email1;name@{null}@microsoft.com is parsed into two groups [[email1],[name,@{null},@microsofot.com]].
  const expression = ExpressionParser.parseTemplateExpression(expressionString);
  if (isStringLiteral(expression)) {
    return validateStringEmails(expression.value);
  } else if (isStringInterpolation(expression)) {
    for (const segment of expression.segments) {
      if (isStringLiteral(segment)) {
        const tokens = segment.value.split(';');
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          const literalExpression = { value: token, type: ExpressionType.StringLiteral };
          emailfields[currentField].push(literalExpression);
          if (i !== tokens.length - 1) {
            currentField++;
            emailfields[currentField] = [];
          }
        }
      } else {
        emailfields[currentField].push(segment);
      }
    }
  } else {
    // NOTE: skip validation for any other expression types.
    return '';
  }

  // NOTE: Validate email literals from the expressions.
  const emails = emailfields
    .filter((field) => field.every((segment) => isStringLiteral(segment)))
    .map((field) => field.map((segment) => (segment as ExpressionLiteral).value.trim()).join(''))
    .filter((email) => email !== '')
    .join(';');

  if (emails !== '') {
    return validateStringEmails(emails);
  }

  return '';
}

function validateStringEmails(parameterValue: string): string {
  const emails = parameterValue
    .split(';')
    .map((email) => email.trim())
    .filter((email) => email !== '');

  const errorMessage = getIntl().formatMessage({ defaultMessage: 'Enter a valid email.', description: 'Error validation message' });
  if (emails.length > 0) {
    for (const email of emails) {
      if (!regex.email.test(email)) {
        return errorMessage;
      }
    }
  } else {
    return errorMessage;
  }

  return '';
}

function isValidJSONObjectFormat(value: string): boolean {
  const trimmedValue = (value || '').trim();
  return startsWith(trimmedValue, '{') && endsWith(trimmedValue, '}');
}

function isValidArrayFormat(value: string): boolean {
  const trimmedValue = (value || '').trim();
  return startsWith(trimmedValue, '[') && endsWith(trimmedValue, ']');
}

export const isISO8601 = (s: string) => {
  const ISO_8601_REGEX = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d+[HMS])(\d+H)?(\d+M)?(\d+S)?)?$/;
  return ISO_8601_REGEX.test(s);
};

export const formatParameterName = (s: string): string => {
  return s && "'" + s[0].toUpperCase() + s.slice(1) + "'";
};
