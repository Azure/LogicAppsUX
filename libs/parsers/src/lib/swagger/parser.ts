/* eslint-disable no-param-reassign */
import { Capabilities, ExtensionProperties, PropertyName, Visibility } from '../common/constants';
import { create } from '../common/helpers/keysutility';
import { OutputsProcessor } from '../common/outputprocessor';
import type { SchemaProcessorOptions } from '../common/schemaprocessor';
import type {
  Annotation,
  InputParameter,
  InputParameters,
  Operation,
  Operations,
  OutputMetadata,
  OutputParameters,
} from '../models/operation';
import { ParametersProcessor } from './parameterprocessor';
import { UriTemplateParser, UriTemplateGenerator } from './uritemplateparser';
import APIParser from '@apidevtools/swagger-parser';
import type { DownloadChunkMetadata, UploadChunkMetadata } from '@microsoft-logic-apps/utils';
import { aggregate, equals, getPropertyValue, map, unmap } from '@microsoft-logic-apps/utils';

interface GetOperationsOptions {
  excludeAdvancedOperations?: boolean;
  excludeInternalOperations?: boolean;
  /**
   * @member {boolean} [unsorted=false] - True if operation should not be sorted.
   */
  unsorted?: boolean;
}

export interface GetResponsesOptions {
  excludeAdvancedOperations?: boolean;
  excludeInternalOperations?: boolean;
}

interface GetInputParametersOptions {
  expandArray?: boolean;
  expandArrayDepth?: number;
  includeParentObject?: boolean;
  includeNotificationParameters?: boolean;
  includePathTemplateParameter?: boolean;
  excludeAdvancedParameters?: boolean;
  excludeInternalParameters?: boolean;
  excludeAdvancedOperations?: boolean;
  excludeInternalOperations?: boolean;
}

interface GetOutputParametersOptions {
  excludeAdvancedOperations?: boolean;
  excludeAdvancedOutputs?: boolean;
  excludeInternalOperations?: boolean;
  excludeInternalOutputs?: boolean;
  expandArrayOutputs?: boolean;
  expandArrayOutputsDepth?: number;
  includeParentObject?: boolean;
}

export interface KeyProjectionOptions {
  locationToKeySegmentsMap?: Record<string /* Parameter in property value */, string[] /* replacement Segments */>;
  keyPrefix?: string[];
}

const ApiNotificationConstants = {
  fetchKeyArray: ['inputs', '$', 'fetch'],
  subscribeKeyArray: ['inputs', '$', 'subscribe'],
  locationToKeySegmentsMap: {
    [PropertyName.QUERY]: [PropertyName.QUERIES],
    [PropertyName.PATH]: [PropertyName.PATHTEMPLATE, PropertyName.PATHTEMPLATE_PARAMETERS] /* replacement Segments */,
  } as Record<string, string[]>,
};

export class SwaggerParser {
  static parse = async (swagger: OpenAPIV2.Document): Promise<OpenAPIV2.Document> => {
    return APIParser.validate(swagger, { dereference: { circular: 'ignore' } });
  };

  constructor(public api: OpenAPIV2.Document) {}

  /**
   * Gets all input parameters by operation ID.
   * @arg {string} operationId
   *    - The ID of the operation whose input parameters are desired.
   * @arg {GetInputParametersOptions} [options]
   *    - An optional object with flags to set operation and parameter exclusions.
   * @arg {KeyProjectionOptions} [keyProjectionOption]
   *    - Optional key projections options
   * @return {InputParameters}
   *    - A string map of input parameter metadata keyed by parameter name.
   */
  getInputParameters(
    operationId: string,
    options?: GetInputParametersOptions,
    keyProjectionOption: KeyProjectionOptions = {}
  ): InputParameters {
    options = { excludeInternalParameters: true, excludeInternalOperations: true, ...options };

    const {
      excludeAdvancedOperations,
      excludeInternalOperations,
      excludeAdvancedParameters,
      excludeInternalParameters,
      expandArray,
      expandArrayDepth,
      includeParentObject,
      includeNotificationParameters,
    } = options;

    const allParameters = map(
      this._getOperations({ excludeAdvancedOperations, excludeInternalOperations }).map((operation) => ({
        operationId: operation.operationId,
        method: operation[ExtensionProperties.Method],
        path: operation[ExtensionProperties.Path],
        operationHeadersExtension: operation[ExtensionProperties.Headers],
        notificationExtension: operation[ExtensionProperties.Notification],
        parameters: operation.parameters
          ?.filter(
            (parameter) =>
              !(excludeInternalParameters && equals(getPropertyValue(parameter, ExtensionProperties.Visibility), Visibility.Internal))
          )
          .filter(
            (parameter) =>
              !(excludeAdvancedParameters && equals(getPropertyValue(parameter, ExtensionProperties.Visibility), Visibility.Advanced))
          ),
      })),
      'operationId'
    );

    const operation = getPropertyValue(allParameters, operationId);

    if (!operation) {
      throw new Error('Operation not found in swagger');
    }

    const processor = new ParametersProcessor(operation.parameters, {
      excludeAdvanced: excludeAdvancedParameters,
      excludeInternal: excludeInternalParameters,
      expandArray,
      expandArrayDepth,
      includeParentObject,
    });

    const relatedNotificationId = includeNotificationParameters ? this.getRelatedNotificationOperationId(operationId) : undefined;

    if (!relatedNotificationId) {
      return this._addAdditionalParametersIfNeeded(operation, processor.getParameters(keyProjectionOption), options, keyProjectionOption);
    }

    const fetchProjectionOptions = {
      keyPrefix: ApiNotificationConstants.fetchKeyArray,
      locationToKeySegmentsMap: ApiNotificationConstants.locationToKeySegmentsMap,
    };

    const updatedOptions = { ...options, includePathTemplateParameter: true };
    const fetchParameters = this._addAdditionalParametersIfNeeded(
      operation,
      processor.getParameters(fetchProjectionOptions),
      updatedOptions,
      fetchProjectionOptions
    );

    const subscribeParameters = this.getInputParameters(
      relatedNotificationId,
      {
        ...updatedOptions,
        excludeAdvancedOperations: false,
        excludeInternalOperations: false,
      },
      {
        keyPrefix: ApiNotificationConstants.subscribeKeyArray,
        locationToKeySegmentsMap: ApiNotificationConstants.locationToKeySegmentsMap,
      }
    );

    const commonParametersParentKeys: Record<string, string> = {
      [create(ApiNotificationConstants.fetchKeyArray.concat(PropertyName.PATHTEMPLATE, PropertyName.PATHTEMPLATE_PARAMETERS)) as string]:
        create(
          ApiNotificationConstants.subscribeKeyArray.concat(PropertyName.PATHTEMPLATE, PropertyName.PATHTEMPLATE_PARAMETERS)
        ) as string,
      [create(
        ApiNotificationConstants.fetchKeyArray.concat(ApiNotificationConstants.locationToKeySegmentsMap[PropertyName.QUERY])
      ) as string]: create(
        ApiNotificationConstants.subscribeKeyArray.concat(ApiNotificationConstants.locationToKeySegmentsMap[PropertyName.QUERY])
      ) as string,
      [create(ApiNotificationConstants.fetchKeyArray.concat(PropertyName.HEADERS)) as string]: create(
        ApiNotificationConstants.subscribeKeyArray.concat(PropertyName.HEADERS)
      ) as string,
    };

    const allFetchKeys = Object.keys(fetchParameters.byId);
    const allSubscribeKeys = Object.keys(subscribeParameters.byId);

    for (const keyStart of Object.keys(commonParametersParentKeys)) {
      allFetchKeys
        .filter((fetchKey) => fetchKey.indexOf(keyStart) === 0)
        .forEach((key) => {
          const correspondingSubscribeKey = commonParametersParentKeys[keyStart] + key.substr(keyStart.length);
          if (allSubscribeKeys.indexOf(correspondingSubscribeKey) >= 0) {
            fetchParameters.byId[key].alternativeKey = correspondingSubscribeKey;
            delete subscribeParameters.byName[subscribeParameters.byId[correspondingSubscribeKey].name];
            delete subscribeParameters.byId[correspondingSubscribeKey];
          }
        });
    }

    return {
      byId: { ...fetchParameters.byId, ...subscribeParameters.byId },
      byName: { ...fetchParameters.byName, ...subscribeParameters.byName },
    };
  }

  /**
   * Gets all output parameters by operation Id.
   * @arg {string} operationId
   *    - The ID of the operation whose output parameters are desired.
   * @arg {GetOutputParametersOptions} [options]
   *    - An optional object with flags to set exclusion options.
   * @return {OutputParameters}
   *    - A string map of output parameter metadata keyed by output parameter title.
   */
  getOutputParameters(operationId: string, options?: GetOutputParametersOptions): OutputParameters {
    const processor = this._getResponsesProcessor(operationId, options);
    return map(processor.getOutputs(), 'key');
  }

  /**
   * Gets the operation matching the specified method and path.
   * @arg {string} method
   *    - A string with an HTTP method
   * @arg {string} path
   *    - A string with a relative URI
   * @arg {boolean} [includeBasePath]
   *    - True if the comparison should include the base path.
   * @returns {Swagger.Operation}
   *    - A JSON object with the Swagger for the matching operation if one was found, else undefined
   */
  getOperationByMethodAndPath(method: string, path: string, includeBasePath = false): OpenAPIV2.OperationObject {
    function matchPath(pathPattern: string): boolean {
      const segments = UriTemplateParser.parse(pathPattern);
      const regex = UriTemplateGenerator.generateRegularExpressionForPath(segments);
      return regex.test(path);
    }

    const operations = this._getOperations({ excludeInternalOperations: true })
      .filter((operation) => equals(operation[ExtensionProperties.Method], method))
      .filter((operation) => {
        const pathPattern = operation[ExtensionProperties.Path].replace(/^\/\{connectionId\}/, '');
        const basePath = operation[ExtensionProperties.BasePath];

        return includeBasePath && !!basePath ? matchPath(`${basePath}${pathPattern}`) : matchPath(pathPattern);
      });

    return operations[0];
  }

  /**
   * Gets all operations keyed by operation ID.
   * @arg {GetOperationsOptions} [options]
   *    - An optional object with flags to set operation exclusions.
   * @return {Operations}
   *    - A string map of operations keyed by operation ID.
   */
  getOperations(options?: GetOperationsOptions): Operations {
    options = { ...{ excludeInternalOperations: true }, ...options };

    const operations: Operation[] = this._getOperations(options).map((operation) => ({
      operationId: operation.operationId as string,
      description: operation.description,
      method: operation[ExtensionProperties.Method],
      path: operation[ExtensionProperties.Path],
      summary: operation.summary,
      triggerType: operation[ExtensionProperties.Trigger],
      triggerHint: operation[ExtensionProperties.TriggerHint],
      visibility: operation[ExtensionProperties.Visibility],
      annotation: this._getAnnotation(operation[ExtensionProperties.Annotation]),
      externalDocs: this._getExternalDocs(operation.externalDocs, operation.description),
      operationHeadersExtension: operation[ExtensionProperties.Headers],
      supportsPaging: operation[ExtensionProperties.SupportsPaging] || false,
      uploadChunkMetadata: this._getUploadChunkMetadata(operation[ExtensionProperties.Capabilities]),
      downloadChunkMetadata: this._getDownloadChunkMetadata(operation[ExtensionProperties.Capabilities]),
    }));

    return map(operations, 'operationId');
  }

  getOperationByOperationId(operationId: string): Operation {
    const operations = this.getOperations({ unsorted: true });
    return getPropertyValue(operations, operationId);
  }

  /**
   * @arg {string} operationId
   *    - A string with the operation name.
   * @return {string | undefined} - The notification operation id.
   */
  getRelatedNotificationOperationId(operationId: string): string | undefined {
    return getPropertyValue(this._getResponses(), operationId)?.notification?.operationId;
  }

  getOutputMetadata(operationId: string): OutputMetadata {
    const processor = this._getResponsesProcessor(operationId);
    return processor.getOutputMetadata();
  }

  operationIsWebhook(operationName: string): boolean {
    return getPropertyValue(this._getResponses(), operationName)?.notificationContent;
  }

  private _getOperations(options: GetOperationsOptions): OpenAPIV2.OperationObject[] {
    const { excludeAdvancedOperations, excludeInternalOperations, unsorted } = options;

    const { basePath, paths } = this.api;
    const pathItems = unmap(paths, 'x-ms-path');
    const pathItemOperations = pathItems.map((pathItem) => includePathItemParameters(pathItem));
    const operations = aggregate(pathItemOperations);

    const mappedOperations = operations.map((operation) => {
      if (basePath && basePath !== '/') {
        const normalizedBasePath = basePath.replace(/\/+$/, '');
        return { ...operation, [ExtensionProperties.BasePath]: normalizedBasePath };
      } else {
        return operation;
      }
    });
    const filteredOperations = mappedOperations
      .filter(
        (operation) =>
          !excludeInternalOperations || !equals(getPropertyValue(operation, ExtensionProperties.Visibility), Visibility.Internal)
      )
      .filter(
        (operation) =>
          !excludeAdvancedOperations || !equals(getPropertyValue(operation, ExtensionProperties.Visibility), Visibility.Advanced)
      );

    return unsorted ? filteredOperations : filteredOperations.sort(orderImportantBeforeOthers).sort(orderAdvancedAfterOthers);
  }

  private _getAnnotation(localAnnotationExtension: any): Annotation {
    // tslint:disable-line: no-any
    let globalAnnotationExtension: any; // tslint:disable-line: no-any
    const info = this.api.info;
    let globalStatus: string | undefined;
    let localStatus: string | undefined;

    if (info) {
      globalAnnotationExtension = info[ExtensionProperties.Annotation];
    }

    if (globalAnnotationExtension) {
      globalStatus = globalAnnotationExtension.status;
    }

    if (localAnnotationExtension) {
      localStatus = localAnnotationExtension.status;
    }

    return {
      status: localStatus || globalStatus,
    };
  }

  private _getUploadChunkMetadata(capabilities: Record<string, any>): UploadChunkMetadata {
    return {
      chunkTransferSupported: !!capabilities && !!capabilities[Capabilities.ChunkTransfer],
      acceptUploadSize: !!capabilities && !!capabilities[Capabilities.AcceptUploadChunkSize],
      minimumSize: capabilities ? capabilities[Capabilities.MinimumUploadChunkSize] : undefined,
      maximumSize: capabilities ? capabilities[Capabilities.MaximumUploadChunkSize] : undefined,
    };
  }

  private _getDownloadChunkMetadata(capabilities: Record<string, any>): DownloadChunkMetadata {
    return {
      acceptDownloadSize: !!capabilities && !!capabilities[Capabilities.AcceptDownloadChunkSize],
      minimumSize: capabilities ? capabilities[Capabilities.MinimumDownloadChunkSize] : undefined,
      maximumSize: capabilities ? capabilities[Capabilities.MaximumDownloadChunkSize] : undefined,
    };
  }

  private _getExternalDocs(
    externalDocs: OpenAPIV2.ExternalDocumentationObject | undefined,
    description: string | undefined
  ): OpenAPIV2.ExternalDocumentationObject | undefined {
    if (externalDocs) {
      externalDocs.description = externalDocs.description || description;
    }

    return externalDocs;
  }

  private _addAdditionalParametersIfNeeded(
    operation: any,
    initialParameters: InputParameters,
    options: GetInputParametersOptions,
    keyProjectionOption: KeyProjectionOptions = {}
  ): InputParameters {
    const addedParameters: InputParameters = { byId: {}, byName: {} };
    if (options.includePathTemplateParameter) {
      const pathParameter: InputParameter = {
        default: removeConnectionPrefix(operation.path),
        type: 'string',
        visibility: 'internal',
        in: PropertyName.PATH,
        name: PropertyName.PATHTEMPLATE_TEMPLATE,
        required: true,
        key: keyProjectionOption.keyPrefix
          ? (create([...keyProjectionOption.keyPrefix, PropertyName.PATHTEMPLATE, PropertyName.PATHTEMPLATE_TEMPLATE]) as string)
          : (create([PropertyName.PATHTEMPLATE, '$', PropertyName.PATHTEMPLATE_TEMPLATE]) as string),
      };

      const methodParameter: InputParameter = {
        default: operation.method,
        type: 'string',
        visibility: 'internal',
        in: '',
        name: PropertyName.METHOD,
        required: true,
        key: keyProjectionOption.keyPrefix
          ? (create([...keyProjectionOption.keyPrefix, PropertyName.METHOD]) as string)
          : (create([PropertyName.BODY, '$', PropertyName.METHOD]) as string),
      };

      addedParameters.byName[pathParameter.name] = pathParameter;
      addedParameters.byId[pathParameter.key] = pathParameter;
      addedParameters.byName[methodParameter.name] = methodParameter;
      addedParameters.byId[methodParameter.key] = methodParameter;
    }

    return {
      byId: {
        ...initialParameters.byId,
        ...addedParameters.byId,
      },
      byName: {
        ...initialParameters.byName,
        ...addedParameters.byName,
      },
    };
  }

  private _getResponsesProcessor(operationId: string, options?: GetOutputParametersOptions): OutputsProcessor {
    options = {
      excludeInternalOperations: true,
      excludeInternalOutputs: true,
      expandArrayOutputs: true,
      expandArrayOutputsDepth: 0,
      ...options,
    };

    const {
      excludeAdvancedOperations,
      excludeAdvancedOutputs,
      excludeInternalOperations,
      excludeInternalOutputs,
      expandArrayOutputs,
      expandArrayOutputsDepth,
      includeParentObject,
    } = options;

    const allResponses = this._getResponses({ excludeAdvancedOperations, excludeInternalOperations });
    const output = getPropertyValue(allResponses, operationId);
    const webhookOutput = output.notificationContent;
    const responses = webhookOutput ? { default: webhookOutput } : output.responses;
    const schemaOptions: SchemaProcessorOptions = {
      excludeAdvanced: excludeAdvancedOutputs,
      excludeInternal: excludeInternalOutputs,
      expandArrayOutputs,
      expandArrayOutputsDepth,
      includeParentObject,
      required: true,
    };
    return new OutputsProcessor(responses, schemaOptions);
  }

  /**
   * Gets all responses by operation Id.
   * @arg {GetResponsesOptions} [options]
   *    - An optional object with flags to set operation exclusions.
   */
  private _getResponses(options?: GetResponsesOptions) {
    options = { excludeInternalOperations: true, ...options };

    const { excludeAdvancedOperations, excludeInternalOperations } = options;

    const responses = this._getOperations({ excludeAdvancedOperations, excludeInternalOperations }).map((operation) => ({
      operationId: operation.operationId,
      method: operation[ExtensionProperties.Method],
      path: operation[ExtensionProperties.Path],
      responses: operation.responses,
      notificationContent: operation[ExtensionProperties.NotificationContent],
      notification: operation[ExtensionProperties.Notification],
    }));

    return map(responses, 'operationId');
  }
}

/**
 * Gets the operation path value stripping off the connector information
 * @arg {string} pathTemplate - the operation path template as in the swagger.
 * @return {string} - The operation path after stripping connector information.
 */
export function removeConnectionPrefix(pathTemplate: string): string {
  const pathPrefix = '{connectionId}';
  let updatedTemplate = pathTemplate;

  updatedTemplate = updatedTemplate.replace(pathPrefix, '');
  updatedTemplate = updatedTemplate.replace('//', '/');

  return updatedTemplate;
}

function includePathItemParameters(pathItem: OpenAPIV2.PathItemObject): OpenAPIV2.OperationObject[] {
  const operations = Object.keys(pathItem)
    .filter((operationKey) => [/get/i, /put/i, /post/i, /delete/i, /options/i, /head/i, /patch/i].some((regex) => regex.test(operationKey)))
    .map((operationKey) => {
      const path = pathItem as any;
      const operation = path[operationKey];
      operation[ExtensionProperties.Path] = path[ExtensionProperties.Path];
      operation[ExtensionProperties.Method] = operationKey;
      operation[ExtensionProperties.NotificationContent] = path[ExtensionProperties.NotificationContent];
      return operation;
    });
  const pathItemParameters = pathItem.parameters || [];

  return operations.map((operation) => {
    const parametersToAdd = pathItemParameters.filter(
      (pathParameter: any) =>
        !operation.parameters.find((operationParameter: OpenAPIV2.Parameter) => equals(operationParameter.name, pathParameter.name))
    );

    return { ...operation, parameters: [...operation.parameters, ...parametersToAdd] };
  });
}

function orderAdvancedAfterOthers(a: OpenAPIV2.OperationObject, b: OpenAPIV2.OperationObject) {
  if (
    !equals(getPropertyValue(a, ExtensionProperties.Visibility), Visibility.Advanced) &&
    equals(getPropertyValue(b, ExtensionProperties.Visibility), Visibility.Advanced)
  ) {
    return -1;
  } else if (
    equals(getPropertyValue(a, ExtensionProperties.Visibility), Visibility.Advanced) &&
    !equals(getPropertyValue(b, ExtensionProperties.Visibility), Visibility.Advanced)
  ) {
    return 1;
  } else {
    return 0;
  }
}

function orderImportantBeforeOthers(a: OpenAPIV2.OperationObject, b: OpenAPIV2.OperationObject) {
  if (
    equals(getPropertyValue(a, ExtensionProperties.Visibility), Visibility.Important) &&
    !equals(getPropertyValue(b, ExtensionProperties.Visibility), Visibility.Important)
  ) {
    return -1;
  } else if (
    !equals(getPropertyValue(a, ExtensionProperties.Visibility), Visibility.Important) &&
    equals(getPropertyValue(b, ExtensionProperties.Visibility), Visibility.Important)
  ) {
    return 1;
  } else {
    return 0;
  }
}
