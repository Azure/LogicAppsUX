import Constants from '../../../common/constants';
import { isRootNode } from '../../parsers/models/workflowNode';
import { convertToStringLiteral, getSplitOnArrayAliasMetadata } from '@microsoft-logic-apps/parsers';
import type { OperationManifest, OperationManifestSetting, UploadChunkMetadata } from '@microsoft-logic-apps/utils';
import {
  equals,
  getObjectPropertyValue,
  getPropertyValue,
  OperationOptions,
  SettingScope,
  ValidationErrorCode,
  ValidationException,
} from '@microsoft-logic-apps/utils';

/**
 * @interface RetryPolicy - The retry policy operation setting.
 */
interface RetryPolicy {
  type: string;
  count?: number;
  interval?: string;
  minimumInterval?: string;
  maximumInterval?: string;
}

/**
 * @interface SimpleSetting - A setting that has a value of some type that can be disabled or enabled.
 */
interface SimpleSetting<T> {
  enabled: boolean;
  value?: T;
}

interface CorrelationSettings {
  clientTrackingId?: string;
}

interface RequestOptions {
  timeout?: string;
}

interface SplitOnConfiguration {
  correlation?: CorrelationSettings;
}

interface UploadChunk {
  transferMode?: string;
  uploadChunkSize?: number;
}

export interface Settings {
  asynchronous?: boolean;
  correlation?: CorrelationSettings;
  secureInputs?: boolean;
  secureOutputs?: boolean;
  disableAsyncPattern?: boolean;
  disableAutomaticDecompression?: boolean;
  splitOn?: SimpleSetting<string>;
  retryPolicy?: RetryPolicy;
  concurrency?: SimpleSetting<number>;
  requestOptions?: RequestOptions;
  sequential?: boolean; // NOTE: This should be removed when logs indicate that none has the definition in the old format.
  singleInstance?: boolean; // NOTE: This should be removed when logs indicate that none has the definition in the old format.
  splitOnConfiguration?: SplitOnConfiguration;
  suppressWorkflowHeaders?: boolean;
  suppressWorkflowHeadersOnResponse?: boolean;
  timeout?: string;
  paging?: SimpleSetting<number>;
  trackedProperties?: any;
  requestSchemaValidation?: boolean;
  conditionExpressions?: string[];
  uploadChunk?: UploadChunk;
  downloadChunkSize?: number;
}

/**
 * Gets the operation options for the specified node based on the definition of the operation in a reload, or from swagger information.
 * @arg {LogicApps.OperationDefinition | LogicAppsV2.OperationDefinition} definition - The JSON from the definition for the given operation.
 * @arg {string} isTrigger - Specifies if this is trigger operation node.
 * @arg {string} [nodeType] - The node type. This parameter should be provided for authoring scenario.
 * @arg {OperationManifest} [manifest] - The operation manifest if node type supports.
 * @return {Settings}
 */
export const getOperationSettings = (
  operation: LogicAppsV2.OperationDefinition,
  isTrigger: boolean,
  nodeType: string,
  manifest?: OperationManifest
): Settings => {
  return {
    asynchronous: getAsynchronous(operation),
    correlation: getCorrelationSettings(operation),
    secureInputs: getSecureInputsSetting(operation),
    secureOutputs: getSecureOutputsSetting(operation),
    disableAsyncPattern: getDisableAsyncPattern(operation),
    disableAutomaticDecompression: getDisableAutomaticDecompression(operation, isTrigger, nodeType, manifest),
    splitOn: getSplitOn(operation, manifest),
    retryPolicy: getRetryPolicy(operation, isTrigger, manifest),
    requestOptions: getRequestOptions(operation),
    sequential: getSequential(operation),
    suppressWorkflowHeaders: getSuppressWorkflowHeaders(isTrigger, operation, nodeType, manifest),
    suppressWorkflowHeadersOnResponse: getSuppressWorkflowHeadersOnResponse(operation),
    concurrency: getConcurrency(operation, isTrigger, nodeType, manifest),
    singleInstance: getSingleInstance(operation),
    splitOnConfiguration: getSplitOnConfiguration(operation),
    timeout: getTimeout(operation, isTrigger, manifest),
    paging: getPaging(operation),
    uploadChunk: getUploadChunk(operation, isTrigger, nodeType, manifest),
    downloadChunkSize: getDownloadChunkSize(operation),
    trackedProperties: getTrackedProperties(operation, isTrigger, manifest),
    requestSchemaValidation: getRequestSchemaValidation(operation),
    conditionExpressions: getConditionExpressions(operation),
  };
};

/**
 * Checks whether the given option is part of the listed operationOptions.
 * @arg {string} operationOption - The operation option.
 * @arg {string} operationOptions  - The list of operation options.
 * @return {boolean}
 */
const isOperationOptionSet = (operationOption: string, operationOptions: string | undefined): boolean => {
  const deserializedOperationOptions = (operationOptions || '').split(',').map((option) => option.trim().toLowerCase());

  return deserializedOperationOptions.indexOf(operationOption.toLowerCase()) > -1;
};

const getAsynchronous = (definition: LogicAppsV2.OperationDefinition): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.ASYNCHRONOUS, operationOptions);
};

const getSplitOnConfiguration = (definition: LogicAppsV2.TriggerDefinition): SplitOnConfiguration | undefined => {
  return definition ? definition.splitOnConfiguration : undefined;
};

const getCorrelationSettings = (definition: LogicAppsV2.TriggerDefinition): CorrelationSettings | undefined => {
  return definition ? definition.correlation : undefined;
};

const getDisableAsyncPattern = (definition: LogicAppsV2.OperationDefinition): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.DISABLE_ASYNC, operationOptions);
};

const getDisableAutomaticDecompression = (
  definition: LogicAppsV2.OperationDefinition,
  isTrigger: boolean,
  nodeType: string,
  manifest?: OperationManifest
): boolean | undefined => {
  const supported = isDisableAutomaticDecompressionSupported(isTrigger, nodeType, manifest);
  const operationOptions = definition && definition.operationOptions;
  return supported
    ? isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.DISABLE_AUTOMATIC_DECOMPRESSION, operationOptions)
    : undefined;
};

const isDisableAutomaticDecompressionSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest && !equals(Constants.NODE.TYPE.OPEN_API_CONNECTION, nodeType)) {
    const operationOptionsSetting = getOperationOptionsSettingFromManifest(manifest);
    return isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) && operationOptionsSetting?.options
      ? operationOptionsSetting.options.indexOf(OperationOptions.DisableAutomaticDecompression) > -1
      : false;
  } else {
    const supportedTypes = [
      Constants.NODE.TYPE.API_CONNECTION,
      Constants.NODE.TYPE.API_MANAGEMENT,
      Constants.NODE.TYPE.FUNCTION,
      Constants.NODE.TYPE.HTTP,
      Constants.NODE.TYPE.OPEN_API_CONNECTION,
      Constants.NODE.TYPE.WORKFLOW,
    ];

    return !isTrigger && supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
  }
};

const getSuppressWorkflowHeaders = (
  isTrigger: boolean,
  definition: LogicAppsV2.OperationDefinition,
  nodeType: string,
  manifest?: OperationManifest
): boolean | undefined => {
  const supported = isSuppressWorkflowHeadersSupported(isTrigger, nodeType, manifest);
  const operationOptions = definition && definition.operationOptions;
  return supported ? isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS, operationOptions) : undefined;
};

const isSuppressWorkflowHeadersSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const operationOptionsSetting = getOperationOptionsSettingFromManifest(manifest);
    return isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) && operationOptionsSetting?.options
      ? operationOptionsSetting.options.indexOf(OperationOptions.SuppressWorkflowHeaders) > -1
      : false;
  } else {
    const supportedTypes = [Constants.NODE.TYPE.API_MANAGEMENT, Constants.NODE.TYPE.FUNCTION, Constants.NODE.TYPE.HTTP];

    return !isTrigger && supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
  }
};

const getSuppressWorkflowHeadersOnResponse = (definition: LogicAppsV2.OperationDefinition): boolean | undefined => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS_ON_RESPONSE, operationOptions);
};

const getRequestSchemaValidation = (definition: LogicAppsV2.OperationDefinition): boolean | undefined => {
  const operationOptions = definition && definition.operationOptions;
  return definition !== undefined
    ? isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.REQUEST_SCHEMA_VALIDATION, operationOptions)
    : undefined;
};

const getConcurrency = (
  definition: LogicAppsV2.OperationDefinition,
  isTrigger: boolean,
  nodeType: string,
  manifest?: OperationManifest
): SimpleSetting<number> | undefined => {
  if (!isConcurrencySupported(isTrigger, nodeType, manifest)) {
    return undefined;
  }

  const operationOptions = definition && definition.operationOptions;

  if (!isTrigger) {
    if (isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SEQUENTIAL, operationOptions)) {
      return {
        enabled: true,
        value: 1,
      };
    }

    let concurrencyRepetitions: number | undefined;
    if (definition) {
      const runtimeConfiguration = getObjectPropertyValue(definition as any, [Constants.SETTINGS.PROPERTY_NAMES.RUNTIME_CONFIGURATION]);
      concurrencyRepetitions = getObjectPropertyValue(runtimeConfiguration, [
        Constants.SETTINGS.PROPERTY_NAMES.CONCURRENCY,
        Constants.SETTINGS.PROPERTY_NAMES.REPETITIONS,
      ]);
    }

    return typeof concurrencyRepetitions === 'number' ? { enabled: true, value: concurrencyRepetitions } : { enabled: false };
  } else {
    if (isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SINGLE_INSTANCE, operationOptions)) {
      return {
        enabled: true,
        value: 1,
      };
    }

    let concurrencyRuns: number | undefined;
    if (definition) {
      concurrencyRuns = getObjectPropertyValue(getRuntimeConfiguration(definition), [
        Constants.SETTINGS.PROPERTY_NAMES.CONCURRENCY,
        Constants.SETTINGS.PROPERTY_NAMES.RUNS,
      ]);
    }

    return typeof concurrencyRuns === 'number' ? { enabled: true, value: concurrencyRuns } : { enabled: false };
  }
};

const isConcurrencySupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const concurrencySetting = getConcurrencySettingFromManifest(manifest);
    return isSettingSupportedFromOperationManifest(concurrencySetting, isTrigger);
  } else {
    if (isTrigger) {
      const supportedTypes = [
        Constants.NODE.TYPE.API_CONNECTION,
        Constants.NODE.TYPE.API_CONNECTION_WEBHOOK,
        Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION,
        Constants.NODE.TYPE.API_MANAGEMENT,
        Constants.NODE.TYPE.HTTP,
        Constants.NODE.TYPE.HTTP_WEBHOOK,
        Constants.NODE.TYPE.MANUAL,
        Constants.NODE.TYPE.RECURRENCE,
      ];
      return supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
    } else {
      return equals(nodeType, Constants.NODE.TYPE.FOREACH);
    }
  }
};

const getConcurrencySettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<void> | undefined => {
  return manifest?.properties?.settings?.concurrency;
};

const getRetryPolicy = (
  definition: LogicAppsV2.ActionDefinition,
  isTrigger: boolean,
  manifest?: OperationManifest
): RetryPolicy | undefined => {
  if (definition) {
    const isRetryableAction = manifest
      ? isSettingSupportedFromOperationManifest(getRetryPolicySettingFromManifest(manifest), isTrigger)
      : isRetryableOperation(definition);
    if (isRetryableAction) {
      const retryableActionDefinition = definition as LogicAppsV2.RetryableOperationDefinition;

      const retryPolicy = retryableActionDefinition && retryableActionDefinition.inputs && retryableActionDefinition.inputs.retryPolicy;

      // NOTE: An absent retry policy indicates that it is using default values.
      if (!retryPolicy) {
        return {
          type: Constants.RETRY_POLICY_TYPE.DEFAULT,
        };
      } else if (typeof retryPolicy !== 'string') {
        return {
          type: retryPolicy.type as string,
          count: retryPolicy.count,
          interval: retryPolicy.interval,
          minimumInterval: retryPolicy.minimumInterval,
          maximumInterval: retryPolicy.maximumInterval,
        };
      } else {
        throw new Error('Cannot determine retry policy since it is assigned at run-time with an expression');
      }
    }

    return undefined;
  } else {
    return {
      type: Constants.RETRY_POLICY_TYPE.DEFAULT,
    };
  }
};

const isRetryableOperation = (operation: LogicAppsV2.OperationDefinition): boolean => {
  if (!operation) {
    return false;
  }

  const supportedTypes = [
    Constants.NODE.TYPE.API_CONNECTION,
    Constants.NODE.TYPE.API_CONNECTION_WEBHOOK,
    Constants.NODE.TYPE.OPEN_API_CONNECTION,
    Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK,
    Constants.NODE.TYPE.API_MANAGEMENT,
    Constants.NODE.TYPE.FUNCTION,
    Constants.NODE.TYPE.HTTP,
    Constants.NODE.TYPE.HTTP_WEBHOOK,
    Constants.NODE.TYPE.WORKFLOW,
  ];
  return supportedTypes.indexOf(operation.type.toLowerCase()) > -1;
};

const getRetryPolicySettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<void> | undefined => {
  return manifest?.properties?.settings?.retryPolicy;
};

const getSequential = (definition: LogicAppsV2.OperationDefinition): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SEQUENTIAL, operationOptions);
};

const getSingleInstance = (definition: LogicAppsV2.OperationDefinition): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SINGLE_INSTANCE, operationOptions);
};

const getSplitOn = (definition: LogicAppsV2.OperationDefinition, manifest?: OperationManifest): SimpleSetting<string> => {
  const splitOnValue = getSplitOnValue(definition, manifest);
  return {
    enabled: !!splitOnValue,
    value: splitOnValue,
  };
};

const getSplitOnValue = (definition: LogicAppsV2.TriggerDefinition, manifest?: OperationManifest): string | undefined => {
  if (definition) {
    return definition.splitOn;
  } else {
    if (manifest) {
      if (equals(manifest.properties.trigger, Constants.BATCH_TRIGGER)) {
        // TODO(3727460) - Consume top level required fields when available here.
        const { alias, propertyName, required } = getSplitOnArrayAliasMetadata(manifest.properties.outputs, /* propertyRequired */ true);
        const propertyPath = alias || propertyName;
        if (propertyPath) {
          return `@${Constants.TRIGGER_OUTPUTS_OUTPUT}${required ? '' : '?'}[${convertToStringLiteral(propertyPath)}]`;
        }
      }

      return undefined;
    } else {
      // Implement for swagger code.

      return undefined;
    }
  }
};

const getTimeout = (definition: LogicAppsV2.ActionDefinition, isTrigger: boolean, manifest?: OperationManifest): string | undefined => {
  const isTimeoutable = manifest
    ? isSettingSupportedFromOperationManifest(getTimeoutSettingFromManifest(manifest), isTrigger)
    : isTimeoutableAction(definition);

  if (isTimeoutable) {
    const timeoutableActionDefinition = definition as LogicAppsV2.TimeoutableActionDefinition;
    return timeoutableActionDefinition?.limit?.timeout;
  }

  return undefined;
};

const isTimeoutableAction = (action: LogicAppsV2.ActionDefinition): boolean => {
  if (!action) {
    return false;
  }

  const supportedTypes = [
    Constants.NODE.TYPE.API_CONNECTION,
    Constants.NODE.TYPE.API_CONNECTION_WEBHOOK,
    Constants.NODE.TYPE.OPEN_API_CONNECTION,
    Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK,
    Constants.NODE.TYPE.API_MANAGEMENT,
    Constants.NODE.TYPE.FUNCTION,
    Constants.NODE.TYPE.HTTP,
    Constants.NODE.TYPE.HTTP_WEBHOOK,
    Constants.NODE.TYPE.WORKFLOW,
  ];
  return supportedTypes.indexOf(action.type.toLowerCase()) > -1;
};

const getTimeoutSettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<void> | undefined => {
  return manifest?.properties?.settings?.timeout;
};

const getRequestOptions = (definition: LogicApps.OperationDefinition | LogicAppsV2.OperationDefinition): RequestOptions | undefined => {
  return definition ? getRuntimeConfiguration(definition)?.requestOptions : undefined;
};

const getPaging = (definition: any): SimpleSetting<number> => {
  let pagingItemCount: number | undefined;
  if (definition) {
    pagingItemCount = getObjectPropertyValue(getRuntimeConfiguration(definition), [
      Constants.SETTINGS.PROPERTY_NAMES.PAGINATION_POLICY,
      Constants.SETTINGS.PROPERTY_NAMES.MINIMUM_ITEM_COUNT,
    ]);
  }

  return {
    enabled: !!pagingItemCount,
    value: pagingItemCount,
  };
};

const getUploadChunk = (
  definition: LogicAppsV2.OperationDefinition,
  isTrigger: boolean,
  nodeType: string,
  manifest?: OperationManifest
): UploadChunk | undefined => {
  if (definition) {
    const runtimeConfiguration = getRuntimeConfiguration(definition);
    return {
      transferMode: getObjectPropertyValue(runtimeConfiguration, [
        Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER,
        Constants.SETTINGS.PROPERTY_NAMES.TRANSFER_MODE,
      ]),
      uploadChunkSize: getObjectPropertyValue(runtimeConfiguration, [
        Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER,
        Constants.SETTINGS.PROPERTY_NAMES.UPLOAD_CHUNK_SIZE,
      ]),
    };
  } else {
    if (isTrigger) {
      return undefined;
    }

    let isChunkTransferSupported = false;
    if (manifest) {
      const chunkingSetting = getOperationChunkingSettingFromManifest(manifest);
      isChunkTransferSupported = isSettingSupportedFromOperationManifest(chunkingSetting, isTrigger);
    } else if (equals(nodeType, Constants.NODE.TYPE.API_CONNECTION)) {
      // TODO - Implement for swagger operation.
    }

    return isChunkTransferSupported ? { transferMode: Constants.SETTINGS.TRANSFER_MODE.CHUNKED } : undefined;
  }
};

const getOperationChunkingSettingFromManifest = (
  manifest: OperationManifest
): OperationManifestSetting<UploadChunkMetadata> | undefined => {
  return manifest?.properties?.settings?.chunking;
};

const getDownloadChunkSize = (definition: LogicAppsV2.OperationDefinition): number | undefined => {
  return definition
    ? getObjectPropertyValue(getRuntimeConfiguration(definition), [
        Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER,
        Constants.SETTINGS.PROPERTY_NAMES.DOWNLOAD_CHUNK_SIZE,
      ])
    : undefined;
};

const getTrackedProperties = (definition: LogicAppsV2.ActionDefinition, isTrigger: boolean, manifest?: OperationManifest): any => {
  const supported = areTrackedPropertiesSupported(isTrigger, manifest);
  return supported && definition ? getPropertyValue(definition as any, 'trackedProperties') : undefined;
};

const areTrackedPropertiesSupported = (isTrigger: boolean, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const setting = getTrackedPropertiesSettingFromManifest(manifest);
    return isSettingSupportedFromOperationManifest(setting, isTrigger);
  }

  return !isTrigger;
};

const getTrackedPropertiesSettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<void> | undefined => {
  return manifest?.properties?.settings?.trackedProperties;
};

const getSecureInputsSetting = (definition: LogicAppsV2.OperationDefinition): boolean => {
  if (definition) {
    const secureData = getObjectPropertyValue(getRuntimeConfiguration(definition), [Constants.SETTINGS.PROPERTY_NAMES.SECURE_DATA]);
    return secureData && secureData.properties.indexOf(Constants.SETTINGS.SECURE_DATA_PROPERTY_NAMES.INPUTS) > -1;
  }

  return false;
};

const getSecureOutputsSetting = (definition: LogicAppsV2.OperationDefinition): boolean => {
  if (definition) {
    const secureData = getObjectPropertyValue(getRuntimeConfiguration(definition), [Constants.SETTINGS.PROPERTY_NAMES.SECURE_DATA]);
    return secureData && secureData.properties.indexOf(Constants.SETTINGS.SECURE_DATA_PROPERTY_NAMES.OUTPUTS) > -1;
  }

  return false;
};

const getConditionExpressions = (definition: LogicAppsV2.TriggerDefinition | undefined): string[] | undefined => {
  // NOTE: Operation definitions do not exist for newly added operations.
  if (!definition) {
    return undefined;
  }

  // NOTE: Actions cannot have conditions in 2016-06-01 schema. Triggers are not required to have conditions in 2016-06-01 schema.
  const { conditions } = definition;
  if (!conditions) {
    return undefined;
  }

  // NOTE: Throw when one or more dependsOn conditions are found in a trigger definition.
  if (conditions.some((condition) => !!condition.dependsOn)) {
    throw new ValidationException(ValidationErrorCode.INVALID_DEPENDSON_CONDITIONS, "Triggers should not have 'dependsOn' conditions.");
  }

  return conditions.map((condition) => condition.expression as string);
};

const getOperationOptionsSettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<OperationOptions[]> | undefined => {
  return manifest && manifest.properties.settings ? manifest.properties.settings.operationOptions : undefined;
};

const getRuntimeConfiguration = (definition: LogicAppsV2.OperationDefinition) => {
  return getObjectPropertyValue(definition as any, [Constants.SETTINGS.PROPERTY_NAMES.RUNTIME_CONFIGURATION]);
};

const isSettingSupportedFromOperationManifest = <T>(
  operationManifestSetting: OperationManifestSetting<T> | undefined,
  isTrigger: boolean
): boolean => {
  return (
    !!operationManifestSetting &&
    (!operationManifestSetting.scopes ||
      operationManifestSetting.scopes.findIndex((scope) => equals(scope, isTrigger ? SettingScope.Trigger : SettingScope.Action)) >= 0)
  );
};

// const isChunkedTransferModeSupported = (nodeId: string, isTrigger: boolean ): boolean => {
//   if (isTrigger) {
//     return false;
//   }
//   return isSettingSupportedFromOperationManifest(getOperationChunkingSettingFromManifest(manifest), false)
//   return isChunkingSupportedFromOperationManifest(nodeId, isTrigger);

// };
