import Constants from '../../../common/constants';
import type { SerializedParameter } from '../../actions/bjsworkflow/serializer';
import { constructInputValues } from '../../actions/bjsworkflow/serializer';
import { getAndEscapeSegment, transformInputParameter, updateParameterWithValues } from '../parameters/helper';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Expression, ExpressionFunction, InputParameter, Segment } from '@microsoft-logic-apps/parsers';
import {
  create,
  ExpressionBuilder,
  ExpressionExceptionCode,
  ExpressionParser,
  ExpressionType,
  isFunction,
  isStringInterpolation,
  isTemplateExpression,
  ParameterLocations,
  parseEx,
  PropertyName,
} from '@microsoft-logic-apps/parsers';
import {
  AssertionErrorCode,
  AssertionException,
  clone,
  endsWith,
  equals,
  first,
  getPropertyValue,
  isNullOrUndefined,
  parsePathnameAndQueryKeyFromUri,
  startsWith,
  UnsupportedException,
} from '@microsoft-logic-apps/utils';

const operationPathDelimiter = '<DELIMITER>';

export interface PathTemplate {
  template: string;
  parameters: Record<string, any>; // tslint:disable-line: no-any
}

export interface OperationInputs {
  method?: string;
  path?: string;
  pathTemplate?: PathTemplate;
  headers?: Record<string, any>;
  queries?: Record<string, any>;
  body?: Record<string, any>;
}

export function buildOperationDetailsFromControls(
  parameters: SerializedParameter[],
  operationPath: string,
  encodePathComponents?: boolean,
  operationMethod?: string,
  shouldUsePathTemplateFormat = false
): OperationInputs {
  const intl = getIntl();
  const result: OperationInputs = operationMethod ? { method: operationMethod } : {};

  const bodyParameters: SerializedParameter[] = [];
  const headerParameters: SerializedParameter[] = [];
  const pathParameters: SerializedParameter[] = [];
  const queryParameters: SerializedParameter[] = [];
  const formDataParameters: SerializedParameter[] = [];
  const builtinParameters: SerializedParameter[] = [];

  for (const parameter of parameters) {
    switch (parameter.info.in) {
      case ParameterLocations.Body:
        bodyParameters.push(parameter);
        break;
      case ParameterLocations.FormData:
        formDataParameters.push(parameter);
        break;
      case ParameterLocations.Header:
        headerParameters.push(parameter);
        break;
      case ParameterLocations.Path:
        pathParameters.push(parameter);
        break;
      case ParameterLocations.Query:
        queryParameters.push(parameter);
        break;
      case undefined:
        builtinParameters.push(parameter);
        break;
      default:
        throw new UnsupportedException(
          intl.formatMessage(
            { defaultMessage: `Unsupported 'in' value : '{value}' in Parameter`, description: 'Error message' },
            { value: parameter.info.in }
          )
        );
    }
  }

  const bodyInputs = serializeBody(bodyParameters);
  const headerInputs = serializeHeaders(headerParameters);
  const pathInputs = serializePath(pathParameters, operationPath, shouldUsePathTemplateFormat, encodePathComponents);
  const queryInputs = serializeQuery(queryParameters);
  const formdataInputs = serializeFormData(formDataParameters);
  const invisibleInputs = serializeInvisibleData(builtinParameters);

  return {
    ...result,
    ...bodyInputs,
    ...headerInputs,
    ...pathInputs,
    ...queryInputs,
    ...formdataInputs,
    ...invisibleInputs,
  };
}

export function loadInputValuesFromDefinition(
  inputValue: Record<string, any>, // tslint:disable-line: no-any
  inputParameters: InputParameter[],
  operationPath: string,
  basePath: string,
  shouldUsePathTemplateFormat = false
): InputParameter[] {
  let result: InputParameter[] = [];

  if (inputValue) {
    const cloneInputValue = clone(inputValue);
    const formDataInputParameters = inputParameters.filter((parameter) => parameter.in === ParameterLocations.FormData);
    result = result.concat(loadFormDataValue(cloneInputValue, formDataInputParameters));

    const bodyInputs = getPropertyValue(cloneInputValue, PropertyName.BODY);
    result = result.concat(
      loadBodyValue(
        bodyInputs,
        inputParameters.filter((parameter) => parameter.in === ParameterLocations.Body)
      )
    );

    const headersInputs = getPropertyValue(cloneInputValue, PropertyName.HEADERS);
    result = result.concat(
      loadHeadersValue(
        headersInputs,
        inputParameters.filter((parameter) => parameter.in === ParameterLocations.Header)
      )
    );

    const queriesInputParameters = inputParameters.filter((parameter) => parameter.in === ParameterLocations.Query);
    const queriesInputs = getQueriesInputs(cloneInputValue, queriesInputParameters);
    result = result.concat(loadQueryValue(queriesInputs, queriesInputParameters));

    const pathInputParameters = inputParameters.filter((parameter) => parameter.in === ParameterLocations.Path);
    const pathInputs = getPathInputs(cloneInputValue, pathInputParameters, operationPath, basePath, shouldUsePathTemplateFormat);
    result = result.concat(loadPathValue(pathInputs, pathInputParameters));

    // some builtin input parameters
    const miscInputParameters = inputParameters.filter(
      (parameter) =>
        parameter.in !== ParameterLocations.Body &&
        parameter.in !== ParameterLocations.Header &&
        parameter.in !== ParameterLocations.Query &&
        parameter.in !== ParameterLocations.Path &&
        parameter.in !== ParameterLocations.FormData
    );

    const extensionInputs = getExtensionInputs(cloneInputValue);
    result = result.concat(loadExtensionValue(extensionInputs, miscInputParameters));

    const sortingKeys = inputParameters.map((item) => item.key);
    result = sortByOrderedKeys(result, sortingKeys);
  }

  return result;
}

function serializeBody(bodyParameters: SerializedParameter[]): Partial<OperationInputs> {
  let bodyValue: any;

  if (bodyParameters.length > 0) {
    const rootParameterKey = create([ParameterLocations.Body, '$']) as string;
    bodyValue = constructInputValues(rootParameterKey, bodyParameters, false /* encodePathComponents */);
  }

  if (bodyValue) {
    return {
      body: bodyValue,
    };
  } else {
    return {};
  }
}

function serializeHeaders(headerParameters: SerializedParameter[]): Partial<OperationInputs> {
  let headersValue: any;
  if (headerParameters.length > 0) {
    const rootParameterKey = create([ParameterLocations.Header, '$']) as string;
    headersValue = constructInputValues(rootParameterKey, headerParameters, false /* encodePathComponents */);
  }

  if (headersValue) {
    return {
      headers: headersValue,
    };
  } else {
    return {};
  }
}

function serializePath(
  pathParameters: SerializedParameter[],
  operationPath: string,
  shouldUsePathTemplateFormat: boolean,
  encodePathComponents?: boolean
): Partial<OperationInputs> {
  const rootParameterKey = create([ParameterLocations.Path, '$']) as string;

  if (shouldUsePathTemplateFormat) {
    let parametersValue = {};
    if (pathParameters.length > 0) {
      parametersValue = constructInputValues(rootParameterKey, pathParameters, false /* encodePathComponents */);
    }

    return {
      pathTemplate: {
        template: operationPath,
        parameters: parametersValue,
      },
    };
  } else {
    let pathValue = operationPath;
    if (pathParameters.length > 0) {
      const value = constructInputValues(rootParameterKey, pathParameters, !!encodePathComponents);
      if (value) {
        pathValue = replacePlaceholders(value, operationPath);
      }
    }

    if (pathValue) {
      return {
        path: pathValue,
      };
    } else {
      return {};
    }
  }
}

function serializeQuery(queryParameters: SerializedParameter[]): Partial<OperationInputs> {
  let queriesValue: any; // tslint:disable-line: no-any
  if (queryParameters.length > 0) {
    const rootParameterKey = create([ParameterLocations.Query, '$']) as string;
    queriesValue = constructInputValues(rootParameterKey, queryParameters, false /* encodePathComponents */);
  }

  if (queriesValue) {
    return {
      queries: queriesValue,
    };
  } else {
    return {};
  }
}

function serializeFormData(formDataParameters: SerializedParameter[]): Partial<OperationInputs> {
  const formDataValue = groupByFormDataParameterName(formDataParameters);
  const keys = Object.keys(formDataValue);
  const multiparts = keys
    .map((parameterName) => {
      const items = formDataValue[parameterName];
      const name = parameterName.replace('"', '%22');
      if (items.length === 1) {
        // NOTE: This is item for non file type form data parameter.
        return createMultipart(name, items[0].value);
      } else if (items.length === 2) {
        // NOTE: These are items for file type form data parameter.
        const firstItemIsContent = endsWith(items[0].parameterKey, Constants.KEY_SEGMENTS.CONTENT);
        const fileContentItem = firstItemIsContent ? items[0] : items[1];
        const fileNameItem = firstItemIsContent ? items[1] : items[0];
        return createMultipart(name, fileContentItem.value, fileNameItem.value);
      } else {
        throw new AssertionException(
          AssertionErrorCode.UNSPECIFIED,
          getIntl().formatMessage(
            {
              defaultMessage: `Invalid operation. Number of items: {length}.`,
              description: 'Exception message for invalid formdata operation.',
            },
            { length: items.length }
          )
        );
      }
    })
    .filter((multipart) => multipart !== undefined);

  if (multiparts.length > 0) {
    return {
      body: {
        '$content-type': 'multipart/form-data',
        $multipart: multiparts,
      },
    };
  } else {
    return {};
  }
}

function serializeInvisibleData(parameters: SerializedParameter[]): Partial<OperationInputs> {
  const result: Record<string, any> = {};
  if (parameters.length > 0) {
    for (const invisibleParameter of parameters.filter((parameter) => parameter.hideInUI)) {
      result[invisibleParameter.parameterName] = invisibleParameter.value;
    }
  }

  return result;
}

function loadBodyValue(inputsBody: any, bodyInputParameters: InputParameter[]): InputParameter[] {
  if (isEmptySegment(inputsBody, bodyInputParameters)) {
    return [];
  }

  const bodyRootKey = create([ParameterLocations.Body, '$']) as string;
  return updateParameterWithValues(
    bodyRootKey,
    inputsBody,
    ParameterLocations.Body,
    bodyInputParameters,
    /* createInvisibleParameter */ true,
    /* useDefault */ false
  );
}

function loadHeadersValue(inputsHeader: any, headerInputParameters: InputParameter[]): InputParameter[] {
  if (isEmptySegment(inputsHeader, headerInputParameters)) {
    return [];
  }

  const headerRootKey = create([ParameterLocations.Header, '$']) as string;
  return updateParameterWithValues(
    headerRootKey,
    inputsHeader,
    ParameterLocations.Header,
    headerInputParameters,
    /* createInvisibleParameter */ true,
    /* useDefault */ false
  );
}

function loadPathValue(inputsPath: Record<string, any>, pathInputParameters: InputParameter[]): InputParameter[] {
  if (!pathInputParameters || pathInputParameters.length === 0) {
    return [];
  }

  const pathRootKey = create([ParameterLocations.Path, '$']) as string;
  return updateParameterWithValues(
    pathRootKey,
    inputsPath,
    ParameterLocations.Path,
    pathInputParameters,
    /* createInvisibleParameter */ true,
    /* useDefault */ false
  );
}

function loadQueryValue(inputsQuery: Record<string, any>, queryInputParameters: InputParameter[]): InputParameter[] {
  if (isEmptySegment(inputsQuery, queryInputParameters)) {
    return [];
  }

  const queryRootKey = create([ParameterLocations.Query, '$']) as string;
  return updateParameterWithValues(
    queryRootKey,
    inputsQuery,
    ParameterLocations.Query,
    queryInputParameters,
    /* createInvisibleParameter */ true,
    /* useDefault */ false
  );
}

function loadFormDataValue(inputs: Record<string, any>, formDataInputParameters: InputParameter[]): InputParameter[] {
  const bodyInput = getPropertyValue(inputs, PropertyName.BODY);
  const generatedByDesigner = isFormDataGeneratedByDesigner(bodyInput);
  if (formDataInputParameters.length > 0 && !generatedByDesigner) {
    return [];
  }

  const result: InputParameter[] = [];
  const multipart = getPropertyValue(bodyInput, '$multipart');
  for (const inputParameter of formDataInputParameters) {
    const value = getFormDataValue(multipart, inputParameter.key);
    result.push(transformInputParameter(inputParameter, value));
  }

  if (bodyInput) {
    delete bodyInput['$multipart'];
    delete bodyInput['$content-type'];
  }

  return result;
}

function loadExtensionValue(inputsExtension: Record<string, any>, miscInputParameters: InputParameter[]): InputParameter[] {
  if (miscInputParameters.length > 0 && Object.keys(inputsExtension).length > 0) {
    // TODO: what's the right key?
    const rootKey = create(['builtin', '$']) as string;
    return updateParameterWithValues(rootKey, inputsExtension, /* parameterLocation */ '', miscInputParameters, false);
  }

  return [];
}

function getQueriesInputs(inputs: Record<string, any>, queriesInputParameters: InputParameter[]): any {
  let queryInputs: Record<string, any> = {};

  for (const inputKey of Object.keys(inputs)) {
    if (equals(inputKey, PropertyName.QUERIES)) {
      queryInputs = inputs[inputKey];
    } else if (equals(inputKey, PropertyName.URI)) {
      const input = inputs[inputKey];
      const { queryKey } = parsePathnameAndQueryKeyFromUri(input);
      queryInputs = { ...queryInputs, ...queryKey };
    } else if (equals(inputKey, PropertyName.PARAMETERS)) {
      const parameterInputs = inputs[inputKey];
      for (const inputParameterName of Object.keys(parameterInputs)) {
        const key = create([ParameterLocations.Query, '$', inputParameterName]);
        const inputParameter = first((item) => item.key === key, queriesInputParameters);
        if (inputParameter) {
          queryInputs[inputParameterName] = parameterInputs[inputParameterName];
        }
      }
    }
  }

  return queryInputs;
}

function getPathInputs(
  inputs: Record<string, any>,
  pathInputParameters: InputParameter[],
  operationPath: string,
  basePath: string,
  shouldUsePathTemplateFormat: boolean
): any {
  let pathInputs: any;

  if (shouldUsePathTemplateFormat) {
    const pathTemplate = getPropertyValue(inputs, PropertyName.PATHTEMPLATE);
    pathInputs = getPropertyValue(pathTemplate, PropertyName.PATHTEMPLATE_PARAMETERS);
  } else {
    pathInputs = {};
    for (const inputKey of Object.keys(inputs)) {
      if (equals(inputKey, PropertyName.PATH)) {
        // NOTE: Path parameter value is the operation path and does not include the base path for both managed apis and custom apis.
        // LA engine will append it at runtime.
        const partialPathInputs = processPathInputs(inputs[inputKey], operationPath);
        pathInputs = { ...pathInputs, ...partialPathInputs };
      } else if (equals(inputKey, PropertyName.URI)) {
        const input = inputs[inputKey];
        const pathname = parsePathnameFromUri(input);
        if (basePath && basePath !== '/') {
          // eslint-disable-next-line no-param-reassign
          operationPath = `${basePath}${operationPath}`;
        }
        const partialPathInputs = processPathInputs(pathname, operationPath);
        pathInputs = { ...pathInputs, ...partialPathInputs };
      } else if (equals(inputKey, PropertyName.PARAMETERS)) {
        const parameterInputs = inputs[inputKey];
        for (const inputParameterName of Object.keys(parameterInputs)) {
          const key = create([ParameterLocations.Path, '$', inputParameterName]);
          const inputParameter = first((item) => item.key === key, pathInputParameters);
          if (inputParameter) {
            pathInputs[inputParameterName] = parameterInputs[inputParameterName];
          }
        }
      }
    }
  }

  return pathInputs;
}

function getExtensionInputs(inputs: Record<string, any>): any {
  const extensionInputs: Record<string, any> = {};
  const authenticationKeyInputs = getPropertyValue(inputs, PropertyName.AUTHENTICATION);

  if (authenticationKeyInputs) {
    extensionInputs[PropertyName.AUTHENTICATION] = inputs[PropertyName.AUTHENTICATION];
  }

  return extensionInputs;
}

function isEmptySegment(value: any, inputParameters: InputParameter[]): boolean {
  return (!inputParameters || inputParameters.length === 0) && (isNullOrUndefined(value) || Object.keys(value).length === 0);
}

function replacePlaceholders(placeholderValues: Record<string, any>, template: string): string {
  const placeholders = Object.keys(placeholderValues).map((placeholderKey) => {
    const value = placeholderValues[placeholderKey];
    return {
      key: placeholderKey,
      placeholderKey: `{${placeholderKey.toUpperCase()}}`,
      value: value ? value : '',
    };
  });
  let updatedTemplate = normalizeTemplate(template);
  for (const placeholder of placeholders) {
    updatedTemplate = updatedTemplate.replace(placeholder.placeholderKey, placeholder.value);
  }

  return updatedTemplate;
}

/**
 * Normalizes the placeholder keys in the template
 * @arg {string} template - path template from the swagger operation
 * @return {string} - template with all the placeholder keys replaced with uppercase values
 */
function normalizeTemplate(template: string): string {
  const pathKeys = template.match(/{(.*?)}/g);
  let updatedTemplate = template;

  if (pathKeys) {
    for (const pathKey of pathKeys) {
      updatedTemplate = template.replace(pathKey, pathKey.toUpperCase());
    }
  }

  return updatedTemplate;
}

function createMultipart(name: string, body: any, fileName?: string) {
  const fileNameSegment = fileName ? `; filename="${fileName}"` : '';
  const contentDisposition = `form-data; name="${name}"${fileNameSegment}`;

  if (body === undefined && fileName === undefined) {
    return undefined;
  } else {
    return {
      [PropertyName.HEADERS]: {
        [PropertyName.CONTENT_DISPOSITION]: contentDisposition,
      },
      [PropertyName.BODY]: body,
    };
  }
}

/**
 * Processes the path value from definition and gets the input parameters from it
 * The path pattern it supports including:
 * - /abc/{name}
 * - /abc/de{name}
 * - /abc/{name}de
 * - expression value contains '/', like @{encodeUriComponent('a/b')}
 * And the pattern it does not support:
 * - /abc/{name1}{name2}
 * - /abc/de{name1}{name2}
 * - /abc/{name1}{name2}suffix
 * - literal path value contains '/'
 * NOTE: it's worth to use https://github.com/edj-boston/matchstick
 * @arg {string} pathValue - Value of the path input from definition
 * @arg {string} pathTemplate - Value of the path template
 * @return {Record<string, any>} - input parameters in the path input {pathKey: value}
 */
function processPathInputs(pathValue: string, pathTemplate: string): Record<string, any> {
  const intl = getIntl();
  const pathInputs: Record<string, any> = {};
  const regex = /{(.*?)}/g;
  // Pathkeys are of the form {key} within the path template.
  const pathKeys = pathTemplate.match(regex);
  const builder = new ExpressionBuilder();

  if (pathKeys && pathKeys.length) {
    const sanitizedTemplateString = pathTemplate.replace(regex, operationPathDelimiter);
    let sanitizedValueString = pathValue;
    let functionSegments: ExpressionFunction[] = [];

    const errorMessage = intl.formatMessage(
      {
        defaultMessage: `Invalid operation path input value. Path value - {pathValue} Path template - {pathTemplate}`,
        description: 'Error message while parsing ',
      },
      { pathValue, pathTemplate }
    );
    if (isTemplateExpression(pathValue)) {
      let result: Expression;
      try {
        result = ExpressionParser.parseTemplateExpression(pathValue);
      } catch (error: any) {
        if (error?.name === ExpressionExceptionCode) {
          throw new Error(errorMessage);
        } else {
          throw new AssertionException(AssertionErrorCode.INVALID_EXPRESSION_IN_PATH_VALUE_SEGMENT, errorMessage, { pathValue }, error);
        }
      }

      if (!isStringInterpolation(result)) {
        throw new Error(errorMessage);
      }

      functionSegments = result.segments.filter(isFunction) as ExpressionFunction[];
      const sanitizedSegments = result.segments.map((segment) => {
        if (isFunction(segment)) {
          return { type: ExpressionType.StringLiteral, value: operationPathDelimiter };
        } else {
          return segment;
        }
      });

      sanitizedValueString = builder.buildTemplateExpression({ type: ExpressionType.StringInterpolation, segments: sanitizedSegments });
    }

    const templateSections = sanitizedTemplateString.split('/');
    const valueSections = sanitizedValueString.split('/');

    if (templateSections.length !== valueSections.length) {
      throw new Error(errorMessage);
    }

    const errorMismatchSegments = intl.formatMessage(
      {
        defaultMessage: `Operation path value does not match the template for segment. Path {pathValue}, Template {pathTemplate}`,
        description: 'Error while parsing expression for path value',
      },
      { pathValue, pathTemplate }
    );

    let parameterIndex = 0;
    let functionIndex = 0;
    for (let i = 0; i < templateSections.length; i++) {
      const templateSection = templateSections[i];
      const valueSection = valueSections[i];
      const parameterCountInTemplateSection = countOccurrence(templateSection, operationPathDelimiter);
      const parameterCountInValueSection = countOccurrence(valueSection, operationPathDelimiter);

      if (templateSection !== valueSection && parameterCountInTemplateSection === 0) {
        throw new Error(errorMismatchSegments);
      }

      if (parameterCountInTemplateSection > 0) {
        // NOTE: If the path template section contains one parameter, its value could be literal or expression segments.
        // If the path template section contains more than one parameter, the corresponding value must be expression value segments generated by the designer.
        if (parameterCountInTemplateSection > 1 && parameterCountInTemplateSection > parameterCountInValueSection) {
          throw new Error(errorMismatchSegments);
        }

        if (parameterCountInTemplateSection === 1) {
          // NOTE: If the section just contains one parameter, just use prefix/suffix to match the value
          const placeHolderPosition = templateSection.indexOf(operationPathDelimiter);
          const nameKey = pathKeys[parameterIndex];
          const pathParameterName = nameKey.substring(1, nameKey.length - 1);
          let parameterValue: string;

          if (templateSection === operationPathDelimiter) {
            if (valueSection === operationPathDelimiter) {
              const functionSegment = functionSegments[functionIndex];
              parameterValue = getStringInterpolatedFunctionExpression(functionSegment);
              functionIndex++;
            } else {
              parameterValue = valueSection;
            }
          } else {
            const prefix = templateSection.substring(0, placeHolderPosition);
            const suffix = templateSection.substring(placeHolderPosition + operationPathDelimiter.length);
            if (!valueSection.startsWith(prefix) || !valueSection.endsWith(suffix)) {
              throw new Error(errorMismatchSegments);
            }

            if (valueSection.indexOf(operationPathDelimiter) < 0) {
              parameterValue = valueSection.substring(prefix.length, valueSection.length - suffix.length);
            } else {
              const functionSegment = functionSegments[functionIndex];
              parameterValue = getStringInterpolatedFunctionExpression(functionSegment);
              functionIndex++;
            }
          }

          pathInputs[pathParameterName] = parameterValue;
          parameterIndex++;
        } else {
          if (templateSection !== valueSection) {
            throw new Error(errorMismatchSegments);
          }

          // NOTE(johnwa): if the section contains more than one parameter, split the section by placeholder, then match each segment using prefix
          let startPos = 0;
          let pos = templateSection.indexOf(operationPathDelimiter, startPos);
          while (pos > -1) {
            const nameKey = pathKeys[parameterIndex++];
            const pathParameterName = nameKey.substring(1, nameKey.length - 1);
            const prefix = templateSection.substring(startPos, pos);
            if (!valueSection.startsWith(prefix, startPos)) {
              throw new Error(errorMismatchSegments);
            }

            const functionSegment = functionSegments[functionIndex++];
            const parameterValue = getStringInterpolatedFunctionExpression(functionSegment);
            pathInputs[pathParameterName] = parameterValue;
            startPos = pos + 1;
            pos = templateSection.indexOf(operationPathDelimiter, startPos);
          }
        }
      }
    }
  }

  return pathInputs;
}

// NOTE: Designer generated multipart is either undefined or looks like below.
//  {
//      "$content-type": "multipart/form-data",
//      "$multipart": [ <part>... ]
//  }
function isFormDataGeneratedByDesigner(body: any): boolean {
  if (body === undefined) {
    return true;
  }

  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    return false;
  }

  if (Object.keys(body).length !== 2) {
    return false;
  }

  if (!equals(getPropertyValue(body, '$content-type'), 'multipart/form-data')) {
    return false;
  }

  const multipart = getPropertyValue(body, '$multipart');
  if (!Array.isArray(multipart)) {
    return false;
  }

  return (
    multipart.filter((part: any) => {
      return !isPartGeneratedByDesigner(part);
    }).length === 0
  );
}

// NOTE: Designer generated part looks like below.
//  {
//      "headers": { "Content-Disposition": "form-data; name=\"<name>\"" },
//      "body": <value>
//  }
// or
//  {
//      "headers": { "Content-Disposition": "form-data; name=\"<name>\"; filename=\"<filename>\"" },
//      "body": <value>
//  }
// There could be no body if body is optional and user didn't set it.
function isPartGeneratedByDesigner(part: any): boolean {
  if (!part) {
    return false;
  }

  const numProperties = Object.keys(part).length;
  if (numProperties !== 1 && numProperties !== 2) {
    return false;
  }

  const headers = getPropertyValue(part, PropertyName.HEADERS);

  if (!headers) {
    return false;
  }

  if (Object.keys(headers).length !== 1) {
    return false;
  }

  const contentDisposition = getPropertyValue(headers, PropertyName.CONTENT_DISPOSITION);

  if (!contentDisposition) {
    return false;
  }

  const prefix = 'form-data; name="';
  const suffix = '"';

  if (contentDisposition.length <= prefix.length + suffix.length) {
    return false;
  }

  if (!startsWith(contentDisposition, prefix) || !endsWith(contentDisposition, suffix)) {
    return false;
  }

  const index = contentDisposition.indexOf('"', prefix.length);
  if (index === contentDisposition.length - 1) {
    return true;
  }

  if (!startsWith(contentDisposition.substring(index), '"; filename="')) {
    return false;
  }

  return true;
}

function getFormDataValue(multipart: any[], key: string): any {
  if (!multipart) {
    return undefined;
  }

  const segments = parseEx(key);
  const name = segments[2].value;
  const isFileType = segments.length > 3;

  const contentDispositionWithoutFilename = `form-data; name="${name}"`;
  const contentDispositionWithFilenamePrefix = `form-data; name="${name}"; filename="`;
  for (const part of multipart) {
    const headers = getPropertyValue(part, PropertyName.HEADERS);
    const contentDisposition = getPropertyValue(headers, PropertyName.CONTENT_DISPOSITION);

    if (!isFileType) {
      // NOTE: Parameter is not file type.
      if (contentDisposition === contentDispositionWithoutFilename) {
        return getPropertyValue(part, PropertyName.BODY);
      }
    } else {
      if (segments[3].value === Constants.KEY_SEGMENTS.CONTENT) {
        // NOTE: Parameter is file content.
        if (
          startsWith(contentDisposition, contentDispositionWithFilenamePrefix) ||
          contentDisposition === contentDispositionWithoutFilename
        ) {
          return getPropertyValue(part, PropertyName.BODY);
        }
      } else {
        // NOTE: Parameter is file name.
        if (startsWith(contentDisposition, contentDispositionWithFilenamePrefix)) {
          return contentDisposition.substring(contentDispositionWithFilenamePrefix.length, contentDisposition.length - 1);
        } else if (contentDisposition === contentDispositionWithoutFilename) {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

function groupByFormDataParameterName(inputs: SerializedParameter[]): Record<string, SerializedParameter[]> {
  const items: Record<string, SerializedParameter[]> = {};

  for (const parameterInfo of inputs) {
    const parameterName = parseEx(parameterInfo.parameterKey)[2].value as string | number;
    if (items[parameterName]) {
      items[parameterName].push(parameterInfo);
    } else {
      items[parameterName] = [parameterInfo];
    }
  }

  return items;
}

function sortByOrderedKeys(inputParameters: InputParameter[], sortingKeys: string[]): InputParameter[] {
  const result: InputParameter[] = [];
  const copy = [...inputParameters];

  while (sortingKeys.length > 0) {
    const key = sortingKeys.shift();
    const index = copy.findIndex((item) => item.key === key);
    if (index >= 0) {
      result.push(...copy.splice(index, 1));
    }
  }

  if (copy.length > 0) {
    result.push(...copy);
  }

  return result;
}

export function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive = false): any {
  if (segments.length === 0) {
    return value;
  }

  if (typeof value !== 'object' && !Array.isArray(value)) {
    return undefined;
  }

  const cloneSegments = [...segments];
  const firstSegment = cloneSegments.shift() as Segment;
  const propertyName = getAndEscapeSegment(firstSegment);

  let propertyValue: any;
  if (typeof propertyName === 'string') {
    propertyValue = caseSensitive ? value[propertyName] : getPropertyValue(value, propertyName);
  } else {
    propertyValue = value[propertyName];
  }
  return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

export function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive = false) {
  let reachEnd = true;
  const cloneSegments = [...segments];
  while (cloneSegments.length > 0) {
    const deleteValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    if (deleteValue === undefined) {
      break;
    }

    const lastSegment = cloneSegments.pop() as Segment;
    const parentValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    let propertyName = getAndEscapeSegment(lastSegment);
    if (!caseSensitive && typeof parentValue === 'object' && typeof propertyName === 'string') {
      for (const key of Object.keys(parentValue)) {
        if (equals(key, propertyName)) {
          propertyName = key;
          break;
        }
      }
    }

    if (reachEnd) {
      reachEnd = false;
      delete parentValue[propertyName];
    } else {
      let ableDelete = true;
      if (typeof deleteValue === 'object' && Object.keys(deleteValue).some((key) => deleteValue[key] !== undefined)) {
        ableDelete = false;
      } else if (Array.isArray(deleteValue) && deleteValue.some((item) => item !== undefined)) {
        ableDelete = false;
      }

      if (ableDelete) {
        delete parentValue[propertyName];
      }
    }
  }
}

function countOccurrence(input: string, target: string): number {
  let count = 0;
  if (!isNullOrUndefined(input) && !isNullOrUndefined(target)) {
    let pos = input.indexOf(target);
    while (pos >= 0) {
      count++;
      pos = input.indexOf(target, pos + 1);
    }
  }

  return count;
}

function getStringInterpolatedFunctionExpression(functionExpression: ExpressionFunction): string {
  const { endPosition, expression, startPosition } = functionExpression;
  return `@{${expression.substring(startPosition, endPosition)}}`;
}

function parsePathnameFromUri(uri: string): string {
  if (isTemplateExpression(uri)) {
    const { pathname } = parsePathnameAndQueryKeyFromUri(uri.replace(/\]\?\[/g, ']%3F[').replace(/\)\?\[/g, ')%3F['));
    return pathname.replace(/\]%3F\[/g, ']?[').replace(/\)%3F\[/g, ')?[');
  } else {
    const { pathname } = parsePathnameAndQueryKeyFromUri(uri);
    return pathname;
  }
}
