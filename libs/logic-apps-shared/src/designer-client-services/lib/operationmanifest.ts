import type { Connector, OperationInfo, OperationManifest } from '../../utils/src';
import { AssertionException, AssertionErrorCode } from '../../utils/src';

/**
 * Operation types (FlowTemplateOperationType, PascalCase as emitted in the workflow definition)
 * whose setting defaults must be fetched from the type-keyed backend route
 * (`operationTypes/{operationType}/settingDefaults`) rather than the connector route.
 *
 * These HTTP-family built-ins are synthetic on the client and are NOT resolvable through the
 * backend `operationGroups` catalog, so the connector route fails validation for them. The type
 * route computes the retry default purely from operationType + workflowKind. Matched
 * case-insensitively; the URL is built from the original PascalCase value.
 */
const settingDefaultsTypeRouteOperationTypes = new Set(
  ['Http', 'HttpWebhook', 'ApiConnection', 'ApiConnectionWebhook', 'OpenApiConnection', 'OpenApiConnectionWebhook'].map((value) =>
    value.toLowerCase()
  )
);

/**
 * Operation types that carry no retry policy, so there are no setting defaults to fetch. The UI
 * skips the `settingDefaults` call entirely for these to avoid needless round trips (and backend
 * 400s/empty responses). Matched case-insensitively. This is an optimization, not a correctness
 * requirement — the backend returns an empty result for these types on the type route.
 */
const settingDefaultsSkippedOperationTypes = new Set(
  [
    'Request',
    'Response',
    'Schedule',
    'Recurrence',
    'DateTime',
    'Compose',
    'Foreach',
    'If',
    'Switch',
    'Scope',
    'Until',
    'Terminate',
    'Wait',
    'InitializeVariable',
    'SetVariable',
    'IncrementVariable',
    'DecrementVariable',
    'AppendToArrayVariable',
    'AppendToStringVariable',
  ].map((value) => value.toLowerCase())
);

/**
 * Returns true when the operation's setting defaults should be fetched from the type-keyed route
 * instead of the connector route.
 */
export const usesSettingDefaultsTypeRoute = (operationType?: string): boolean =>
  !!operationType && settingDefaultsTypeRouteOperationTypes.has(operationType.toLowerCase());

/**
 * Returns true when the settingDefaults call should be skipped entirely because the operation type
 * has no retry policy (and therefore no defaults to apply).
 */
export const isSettingDefaultsSkippedOperationType = (operationType?: string): boolean =>
  !!operationType && settingDefaultsSkippedOperationTypes.has(operationType.toLowerCase());

/**
 * The operation manifest service.
 */
export interface IOperationManifestService {
  /**
   * Checks if the operation type is supported.
   * @arg [string] operationType - The operation type.
   * @arg [string] operationKind - The operation kind.
   * @return {boolean}
   */
  isSupported(operationType?: string, operationKind?: string): boolean;

  /**
   * Checks if the operation type has aliasing supported.
   * @arg [string] operationType - The operation type.
   * @arg [string] operationKind - The operation kind.
   * @return {boolean}
   */
  isAliasingSupported(operationType?: string, operationKind?: string): boolean;

  /**
   * Gets the operation info.
   * @arg {any} definition - The operation definition.
   * @arg {boolean} isTrigger - Flag to determine if the definition is of a trigger operation.
   * @return {Promise<OperationInfo>}
   */
  getOperationInfo(definition: any, isTrigger: boolean): Promise<OperationInfo>;

  /**
   * Gets the operation manifest for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @return {Promise<any>}
   */
  getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest>;

  /**
   * Gets the operation data for an operation.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {boolean} [useCachedData] - Flag whether to use previously cache data.
   * @return {Promise<any>}
   */
  getOperation(connectorId: string, operationId: string, useCachedData?: boolean): Promise<any>;

  /**
   * Checks if the connector is a built-in connector.
   * @arg {string} connectorId - The connector id.
   * @return {boolean}
   */
  isBuiltInConnector(connectorId: string): boolean;

  /**
   * Gets the connector for built-in operation.
   * @arg {string} connectorId - The connector id.
   * @return {string}
   */
  getBuiltInConnector(connectorId: string): Connector;

  /**
   * Gets default setting values for an operation from the backend.
   * @arg {string} connectorId - The connector id.
   * @arg {string} operationId - The operation id.
   * @arg {string[]} supportedSettings - The list of supported setting keys to fetch defaults for.
   * @arg {string} [workflowKind] - The workflow kind (stateful, stateless, agent).
   * @arg {string} [operationType] - The node's operation type (FlowTemplateOperationType, PascalCase).
   *   When the type uses the type-keyed route, defaults are fetched by type instead of connector/operation.
   * @return {Promise<Record<string, any> | undefined>}
   */
  getSettingDefaults?(
    connectorId: string,
    operationId: string,
    supportedSettings: string[],
    workflowKind?: string,
    operationType?: string
  ): Promise<Record<string, any> | undefined>;
}

let service: IOperationManifestService;

export const InitOperationManifestService = (manifestService: IOperationManifestService): void => {
  service = manifestService;
};

export const OperationManifestService = (): IOperationManifestService => {
  if (!service) {
    throw new AssertionException(
      AssertionErrorCode.SERVICE_NOT_INITIALIZED,
      'OperationManifestService needs to be initialized before using'
    );
  }

  return service;
};

export const TryGetOperationManifestService = (): IOperationManifestService => {
  return service;
};
