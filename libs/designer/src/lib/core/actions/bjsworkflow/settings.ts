import Constants from '../../../common/constants';
import { convertToStringLiteral, getSplitOnArrayAliasMetadata } from '@microsoft-logic-apps/parsers';
import type {
  DownloadChunkMetadata,
  OperationManifest,
  OperationManifestSetting,
  OperationManifestSettings,
  SecureDataOptions,
  UploadChunkMetadata,
} from '@microsoft-logic-apps/utils';
import {
  equals,
  getObjectPropertyValue,
  getPropertyValue,
  OperationOptions,
  SettingScope,
  ValidationErrorCode,
  ValidationException,
} from '@microsoft-logic-apps/utils';

type OperationManifestSettingType = UploadChunkMetadata | DownloadChunkMetadata | SecureDataOptions | OperationOptions[] | void;

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

export interface GraphEdge {
  predecessorId: string;
  successorId?: string;
  metadata?: string;
  statuses: string[];
}
interface SettingData<T> {
  isSupported: boolean;
  value?: T;
}

export interface Settings {
  asynchronous?: SettingData<boolean>;
  correlation?: SettingData<CorrelationSettings>;
  secureInputs?: SettingData<boolean>;
  secureOutputs?: SettingData<boolean>;
  disableAsyncPattern?: SettingData<boolean>;
  disableAutomaticDecompression?: SettingData<boolean>;
  splitOn?: SettingData<SimpleSetting<string>>;
  retryPolicy?: SettingData<RetryPolicy>;
  concurrency?: SettingData<SimpleSetting<number>>;
  requestOptions?: SettingData<RequestOptions>;
  sequential?: boolean; // NOTE: This should be removed when logs indicate that none has the definition in the old format.
  singleInstance?: boolean; // NOTE: This should be removed when logs indicate that none has the definition in the old format.
  splitOnConfiguration?: SplitOnConfiguration;
  suppressWorkflowHeaders?: SettingData<boolean>;
  suppressWorkflowHeadersOnResponse?: SettingData<boolean>;
  timeout?: SettingData<string>;
  paging?: SettingData<SimpleSetting<number>>;
  trackedProperties?: SettingData<any>;
  requestSchemaValidation?: SettingData<boolean>;
  conditionExpressions?: SettingData<string[]>;
  uploadChunk?: SettingData<UploadChunk>;
  downloadChunkSize?: SettingData<number>;
  runAfter?: SettingData<GraphEdge[]>;
}

/**
 * Gets the operation options for the specified node based on the definition of the operation in a reload, or from swagger information.
 * @arg {string} isTrigger - Specifies if this is trigger operation node.
 * @arg {string} nodeType - The node type. This parameter should be provided for authoring scenario.
 * @arg {string} [nodeKind] - The node kind. This parameter should be provided for authoring scenario.
 * @arg {OperationManifest} [manifest] - The operation manifest if node type supports.
 * @arg {LogicApps.OperationDefinition | LogicAppsV2.OperationDefinition} [operation] - The JSON from the definition for the given operation.
 * @return {Settings}
 */
export const getOperationSettings = (
  isTrigger: boolean,
  nodeType: string,
  nodeKind?: string,
  manifest?: OperationManifest,
  operation?: LogicAppsV2.OperationDefinition
): Settings => {
  return {
    asynchronous: { isSupported: isAsynchronousSupported(isTrigger, nodeType, manifest), value: getAsynchronous(operation) },
    correlation: { isSupported: isCorrelationSupported(isTrigger, manifest), value: getCorrelationSettings(operation) },
    secureInputs: {
      isSupported: isInputsPropertySupportedInSecureDataSetting(nodeType, manifest),
      value: getSecureInputsSetting(operation),
    },
    secureOutputs: {
      isSupported: isOutputsPropertySupportedInSecureDataSetting(nodeType, manifest),
      value: getSecureOutputsSetting(operation),
    },
    disableAsyncPattern: {
      isSupported: isDisableAsyncPatternSupported(isTrigger, nodeType, manifest),
      value: getDisableAsyncPattern(operation),
    },
    disableAutomaticDecompression: {
      isSupported: isDisableAutomaticDecompressionSupported(isTrigger, nodeType, manifest),
      value: getDisableAutomaticDecompression(operation, isTrigger, nodeType, manifest),
    },
    splitOn: { isSupported: isSplitOnSupported(operation, isTrigger, nodeType, manifest), value: getSplitOn(operation, manifest) },
    retryPolicy: {
      isSupported: isRetryPolicySupported(operation, isTrigger, manifest),
      value: getRetryPolicy(operation, isTrigger, manifest),
    },
    requestOptions: { isSupported: areRequestOptionsSupported(isTrigger, nodeType), value: getRequestOptions(operation) },
    sequential: getSequential(operation),
    suppressWorkflowHeaders: {
      isSupported: isSuppressWorkflowHeadersSupported(isTrigger, nodeType, manifest),
      value: getSuppressWorkflowHeaders(isTrigger, operation, nodeType, manifest),
    },
    suppressWorkflowHeadersOnResponse: {
      isSupported: isSuppressWorklowHeadersOnResponseSupported(isTrigger, nodeType, nodeKind, manifest),
      value: getSuppressWorkflowHeadersOnResponse(operation),
    },
    concurrency: {
      isSupported: isConcurrencySupported(isTrigger, nodeType, manifest),
      value: getConcurrency(operation, isTrigger, nodeType, manifest),
    },
    singleInstance: getSingleInstance(operation),
    splitOnConfiguration: getSplitOnConfiguration(operation),
    timeout: {
      isSupported: isTimeoutSupported(isTrigger, nodeType, manifest),
      value: getTimeout(operation, nodeType, isTrigger, manifest),
    },
    paging: { isSupported: isPagingSupported(isTrigger, nodeType, manifest), value: getPaging(operation) },
    uploadChunk: {
      isSupported: isChunkedTransferModeSupported(isTrigger, nodeType, manifest),
      value: getUploadChunk(operation, isTrigger, nodeType, manifest),
    },
    downloadChunkSize: {
      isSupported: isChunkedTransferModeSupported(isTrigger, nodeType, manifest),
      value: getDownloadChunkSize(operation),
    },
    trackedProperties: {
      isSupported: areTrackedPropertiesSupported(isTrigger, manifest),
      value: getTrackedProperties(operation, isTrigger, manifest),
    },
    requestSchemaValidation: {
      isSupported: isRequestSchemaValidationSupported(isTrigger, nodeType, nodeKind, manifest),
      value: getRequestSchemaValidation(operation),
    },
    conditionExpressions: { isSupported: isTrigger, value: getConditionExpressions(operation) },
    runAfter: {
      isSupported: getRunAfter(operation).length > 0,
      value: getRunAfter(operation),
    },
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

const getAsynchronous = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.ASYNCHRONOUS, operationOptions);
};

const isAsynchronousSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const operationOptionSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as OperationManifestSetting<
      OperationOptions[]
    >;

    return (
      isSettingSupportedFromOperationManifest(operationOptionSetting, isTrigger) &&
      !!operationOptionSetting.options &&
      operationOptionSetting.options.indexOf(OperationOptions.Asynchronous) > -1
    );
  } else {
    return equals(nodeType, Constants.NODE.TYPE.RESPONSE);
  }
};

const getSplitOnConfiguration = (definition: LogicAppsV2.TriggerDefinition | undefined): SplitOnConfiguration | undefined => {
  return definition ? definition.splitOnConfiguration : undefined;
};

const getCorrelationSettings = (definition: LogicAppsV2.TriggerDefinition | undefined): CorrelationSettings | undefined => {
  return definition ? definition.correlation : undefined;
};

const isCorrelationSupported = (isTrigger: boolean, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const correlationSetting = getOperationSettingFromManifest(manifest, 'correlation') as
      | OperationManifestSetting<CorrelationSettings>
      | undefined;
    return isSettingSupportedFromOperationManifest(correlationSetting, isTrigger);
  } else {
    return isTrigger;
  }
};

const isDisableAsyncPatternSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest && !equals(Constants.NODE.TYPE.OPEN_API_CONNECTION, nodeType)) {
    const operationOptionsSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as
      | OperationManifestSetting<OperationOptions[]>
      | undefined;
    return isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) && operationOptionsSetting?.options
      ? operationOptionsSetting.options.indexOf(OperationOptions.DisableAsyncPattern) > -1
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

const getDisableAsyncPattern = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.DISABLE_ASYNC, operationOptions);
};

const getDisableAutomaticDecompression = (
  definition: LogicAppsV2.OperationDefinition | undefined,
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
    const operationOptionsSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as
      | OperationManifestSetting<OperationOptions[]>
      | undefined;
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
  definition: LogicAppsV2.OperationDefinition | undefined,
  nodeType: string,
  manifest?: OperationManifest
): boolean | undefined => {
  const supported = isSuppressWorkflowHeadersSupported(isTrigger, nodeType, manifest);
  const operationOptions = definition && definition.operationOptions;
  return supported ? isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS, operationOptions) : undefined;
};

const isSuppressWorkflowHeadersSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const operationOptionsSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as
      | OperationManifestSetting<OperationOptions[]>
      | undefined;
    return isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) && operationOptionsSetting?.options
      ? operationOptionsSetting.options.indexOf(OperationOptions.SuppressWorkflowHeaders) > -1
      : false;
  } else {
    const supportedTypes = [Constants.NODE.TYPE.API_MANAGEMENT, Constants.NODE.TYPE.FUNCTION, Constants.NODE.TYPE.HTTP];

    return !isTrigger && supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
  }
};

const getSuppressWorkflowHeadersOnResponse = (definition: LogicAppsV2.OperationDefinition | undefined): boolean | undefined => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SUPPRESS_WORKFLOW_HEADERS_ON_RESPONSE, operationOptions);
};

const isSuppressWorklowHeadersOnResponseSupported = (
  isTrigger: boolean,
  nodeType: string,
  nodeKind?: string,
  manifest?: OperationManifest
): boolean => {
  if (manifest) {
    const operationOptionsSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as
      | OperationManifestSetting<OperationOptions[]>
      | undefined;
    return (
      isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) &&
      (operationOptionsSetting && operationOptionsSetting.options
        ? operationOptionsSetting.options.indexOf(OperationOptions.SuppressWorkflowHeadersOnResponse) > -1
        : false)
    );
  } else {
    return isTrigger && equals(nodeType, Constants.NODE.TYPE.MANUAL) && equals(nodeKind, Constants.NODE.KIND.HTTP);
  }
};

const getRequestSchemaValidation = (definition: LogicAppsV2.OperationDefinition | undefined): boolean | undefined => {
  const operationOptions = definition && definition.operationOptions;
  return definition !== undefined
    ? isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.REQUEST_SCHEMA_VALIDATION, operationOptions)
    : undefined;
};

const isRequestSchemaValidationSupported = (
  isTrigger: boolean,
  nodeType: string,
  nodeKind?: string,
  manifest?: OperationManifest
): boolean => {
  if (manifest) {
    const operationOptionsSetting = getOperationSettingFromManifest(manifest, 'operationOptions') as
      | OperationManifestSetting<OperationOptions[]>
      | undefined;
    return (
      isSettingSupportedFromOperationManifest(operationOptionsSetting, isTrigger) &&
      (operationOptionsSetting && operationOptionsSetting.options
        ? operationOptionsSetting.options.indexOf(OperationOptions.EnableSchemaValidation) > -1
        : false)
    );
  } else {
    return equals(nodeType, Constants.NODE.TYPE.MANUAL) && equals(nodeKind, Constants.NODE.KIND.HTTP);
  }
};

const getConcurrency = (
  definition: LogicAppsV2.OperationDefinition | undefined,
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
    const concurrencySetting = getOperationSettingFromManifest(manifest, 'concurrency') as OperationManifestSetting<void> | undefined;
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

const getRetryPolicy = (
  definition: LogicAppsV2.ActionDefinition | undefined,
  isTrigger: boolean,
  manifest?: OperationManifest
): RetryPolicy | undefined => {
  if (definition) {
    const isRetryableAction = manifest
      ? isSettingSupportedFromOperationManifest(
          getOperationSettingFromManifest(manifest, 'retryPolicy') as OperationManifestSetting<void>,
          isTrigger
        )
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

const isRetryableOperation = (operation: LogicAppsV2.OperationDefinition | undefined): boolean => {
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

const isRetryPolicySupported = (
  definition: LogicAppsV2.OperationDefinition | undefined,
  isTrigger: boolean,
  manifest?: OperationManifest
): boolean => {
  return manifest
    ? isSettingSupportedFromOperationManifest(
        getOperationSettingFromManifest(manifest, 'retryPolicy') as OperationManifestSetting<void>,
        isTrigger
      )
    : isRetryableOperation(definition);
};

const getSequential = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SEQUENTIAL, operationOptions);
};

const getSingleInstance = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
  const operationOptions = definition && definition.operationOptions;
  return isOperationOptionSet(Constants.SETTINGS.OPERATION_OPTIONS.SINGLE_INSTANCE, operationOptions);
};

const getSplitOn = (definition: LogicAppsV2.OperationDefinition | undefined, manifest?: OperationManifest): SimpleSetting<string> => {
  const splitOnValue = getSplitOnValue(definition, manifest);
  return {
    enabled: !!splitOnValue,
    value: splitOnValue,
  };
};

const getSplitOnValue = (definition: LogicAppsV2.TriggerDefinition | undefined, manifest?: OperationManifest): string | undefined => {
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

const isSplitOnSupported = (
  definition: LogicAppsV2.OperationDefinition | undefined,
  isTrigger: boolean,
  nodeType: string,
  manifest?: OperationManifest
): boolean => {
  const existingSplitOn = getSplitOn(definition, manifest);
  return isTrigger && existingSplitOn.enabled;
};

const getTimeout = (
  definition: LogicAppsV2.ActionDefinition | undefined,
  nodeType: string,
  isTrigger: boolean,
  manifest?: OperationManifest
): string | undefined => {
  const isTimeoutable = manifest
    ? isSettingSupportedFromOperationManifest(
        getOperationSettingFromManifest(manifest, 'timeout') as OperationManifestSetting<void>,
        isTrigger
      )
    : isTimeoutableAction(nodeType);

  if (isTimeoutable) {
    const timeoutableActionDefinition = definition as LogicAppsV2.TimeoutableActionDefinition;
    return timeoutableActionDefinition?.limit?.timeout;
  }

  return undefined;
};

const isTimeoutableAction = (operationType: string): boolean => {
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
  return supportedTypes.indexOf(operationType.toLowerCase()) > -1;
};

const isTimeoutSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  return manifest
    ? isSettingSupportedFromOperationManifest(
        getOperationSettingFromManifest(manifest, 'timeout') as OperationManifestSetting<void>,
        isTrigger
      )
    : isTimeoutableAction(nodeType);
};

const getOperationSettingFromManifest = (
  manifest: OperationManifest,
  operation: keyof OperationManifestSettings
): OperationManifestSetting<OperationManifestSettingType> | undefined => {
  return manifest?.properties?.settings?.[operation];
};

const getRequestOptions = (
  definition: LogicApps.OperationDefinition | LogicAppsV2.OperationDefinition | undefined
): RequestOptions | undefined => {
  return definition ? getRuntimeConfiguration(definition)?.requestOptions : undefined;
};

const areRequestOptionsSupported = (isTrigger: boolean, nodeType: string): boolean => {
  // NOTE(andrewfowose) We currently only support request timout option for HTTP & HTTP + Swagger actions
  const supportedTypes = [Constants.NODE.TYPE.HTTP];
  return !isTrigger && supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
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

const isPagingSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  // TODO (andrewfowose): return false if isBranchNode
  if (manifest) {
    const pagingSetting = getOperationSettingFromManifest(manifest, 'paging') as OperationManifestSetting<void> | undefined;
    return isSettingSupportedFromOperationManifest(pagingSetting, isTrigger);
  } else {
    if (isTrigger) {
      return false;
    }
    const supportedTypes = [Constants.NODE.TYPE.API_CONNECTION, Constants.NODE.TYPE.FUNCTION, Constants.NODE.TYPE.HTTP];
    const isSupportedType = supportedTypes.indexOf(nodeType.toLowerCase()) > -1;
    return isSupportedType;
  }
  // TODO (andrewfowose): add check for if paging is supported from swagger
};

const getUploadChunk = (
  definition: LogicAppsV2.OperationDefinition | undefined,
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
      const chunkingSetting = getOperationSettingFromManifest(manifest, 'chunking') as
        | OperationManifestSetting<UploadChunkMetadata>
        | undefined;
      isChunkTransferSupported = isSettingSupportedFromOperationManifest(chunkingSetting, isTrigger);
    } else if (equals(nodeType, Constants.NODE.TYPE.API_CONNECTION)) {
      // TODO - Implement for swagger operation.
    }

    return isChunkTransferSupported ? { transferMode: Constants.SETTINGS.TRANSFER_MODE.CHUNKED } : undefined;
  }
};

export const isChunkedTransferModeSupported = (isTrigger: boolean, nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const chunkingSetting = getOperationSettingFromManifest(manifest, 'chunking') as
      | OperationManifestSetting<UploadChunkMetadata>
      | undefined;
    return isSettingSupportedFromOperationManifest(chunkingSetting, isTrigger);
  } else if (isTrigger) {
    return false;
  }
  return equals(nodeType, Constants.NODE.TYPE.API_CONNECTION);
  // add if check to implement swagger operation.
};

const getDownloadChunkSize = (definition: LogicAppsV2.OperationDefinition | undefined): number | undefined => {
  return definition
    ? getObjectPropertyValue(getRuntimeConfiguration(definition), [
        Constants.SETTINGS.PROPERTY_NAMES.CONTENT_TRANSFER,
        Constants.SETTINGS.PROPERTY_NAMES.DOWNLOAD_CHUNK_SIZE,
      ])
    : undefined;
};

const getTrackedProperties = (
  definition: LogicAppsV2.ActionDefinition | undefined,
  isTrigger: boolean,
  manifest?: OperationManifest
): any => {
  const supported = areTrackedPropertiesSupported(isTrigger, manifest);
  return supported && definition ? getPropertyValue(definition as any, 'trackedProperties') : undefined;
};

const areTrackedPropertiesSupported = (isTrigger: boolean, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const setting = getOperationSettingFromManifest(manifest, 'trackedProperties') as OperationManifestSetting<void> | undefined;
    return isSettingSupportedFromOperationManifest(setting, isTrigger);
  }

  return !isTrigger;
};

const getSecureInputsSetting = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
  if (definition) {
    const secureData = getObjectPropertyValue(getRuntimeConfiguration(definition), [Constants.SETTINGS.PROPERTY_NAMES.SECURE_DATA]);
    return secureData && secureData.properties.indexOf(Constants.SETTINGS.SECURE_DATA_PROPERTY_NAMES.INPUTS) > -1;
  }

  return false;
};

const isInputsPropertySupportedInSecureDataSetting = (nodeType: string, manifest?: OperationManifest): boolean => {
  // where to check if SUPPORT_OBFUSCATION feature is enabled?
  if (manifest) {
    const secureDataSetting = getOperationSettingFromManifest(manifest, 'secureData') as
      | OperationManifestSetting<SecureDataOptions>
      | undefined;
    if (secureDataSetting) {
      return manifest.properties.inputs !== undefined;
    }
    return false;
  } else {
    // TODO (andrewfowose) add else if to check if node is branch node and return false if so
    const unsupportedTypes = [
      Constants.NODE.TYPE.APPEND_TO_ARRAY_VARIABLE,
      Constants.NODE.TYPE.APPEND_TO_STRING_VARIABLE,
      Constants.NODE.TYPE.DECREMENT_VARIABLE,
      Constants.NODE.TYPE.FOREACH,
      Constants.NODE.TYPE.IF,
      Constants.NODE.TYPE.INCREMENT_VARIABLE,
      Constants.NODE.TYPE.INITIALIZE_VARIABLE,
      Constants.NODE.TYPE.RECURRENCE,
      Constants.NODE.TYPE.SCOPE,
      Constants.NODE.TYPE.SET_VARIABLE,
      Constants.NODE.TYPE.SWITCH,
      Constants.NODE.TYPE.TERMINATE,
      Constants.NODE.TYPE.UNTIL,
    ];
    return unsupportedTypes.indexOf(nodeType.toLowerCase()) < 0;
  }
};

const isOutputsPropertySupportedInSecureDataSetting = (nodeType: string, manifest?: OperationManifest): boolean => {
  if (manifest) {
    const secureDataSetting = getOperationSettingFromManifest(manifest, 'secureData') as
      | OperationManifestSetting<SecureDataOptions>
      | undefined;
    if (secureDataSetting) {
      const { options } = secureDataSetting;
      return (options === undefined || options.outputsMode === undefined) && manifest.properties.outputs !== undefined;
    }
    return false;
  } else {
    // TODO (andrewfowose) add else if to check if node is branch node and return false if so
    const unsupportedTypes = [
      Constants.NODE.TYPE.APPEND_TO_ARRAY_VARIABLE,
      Constants.NODE.TYPE.APPEND_TO_STRING_VARIABLE,
      Constants.NODE.TYPE.COMPOSE,
      Constants.NODE.TYPE.DECREMENT_VARIABLE,
      Constants.NODE.TYPE.FOREACH,
      Constants.NODE.TYPE.IF,
      Constants.NODE.TYPE.INCREMENT_VARIABLE,
      Constants.NODE.TYPE.INITIALIZE_VARIABLE,
      Constants.NODE.TYPE.PARSE_JSON,
      Constants.NODE.TYPE.RECURRENCE,
      Constants.NODE.TYPE.RESPONSE,
      Constants.NODE.TYPE.SCOPE,
      Constants.NODE.TYPE.SET_VARIABLE,
      Constants.NODE.TYPE.SWITCH,
      Constants.NODE.TYPE.TERMINATE,
      Constants.NODE.TYPE.UNTIL,
      Constants.NODE.TYPE.WAIT,
    ];
    return unsupportedTypes.indexOf(nodeType.toLowerCase()) < 0;
  }
};

const getSecureOutputsSetting = (definition: LogicAppsV2.OperationDefinition | undefined): boolean => {
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

const getRunAfter = (definition: LogicAppsV2.ActionDefinition | undefined): GraphEdge[] => {
  const graphEdges = [];
  if (definition?.runAfter) {
    for (const [predecessorId, statuses] of Object.entries(definition.runAfter)) {
      graphEdges.push({ predecessorId, statuses });
    }
  }
  return graphEdges;
};

// const getOperationOptionsSettingFromManifest = (manifest: OperationManifest): OperationManifestSetting<OperationOptions[]> | undefined => {
//   return manifest && manifest.properties.settings ? manifest.properties.settings.operationOptions : undefined;
// };

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
