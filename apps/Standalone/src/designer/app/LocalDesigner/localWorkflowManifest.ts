import {
  StandardConnectorService,
  StandardOperationManifestService,
  type IHttpClient,
  type LogicAppsV2,
  type OpenAPIV2,
  type OperationManifest,
} from '@microsoft/logic-apps-shared';
import {
  type LocalWorkflowRegistry,
  localWorkflowOperation,
  localWorkflowRegistry,
  localWorkflowSchemaOperation,
} from './localWorkflowRegistry';
export { localWorkflowOperation } from './localWorkflowRegistry';

const isLocalOperation = (connectorId: string, operationId: string): boolean =>
  connectorId.toLowerCase() === localWorkflowOperation.connectorId && operationId.toLowerCase() === localWorkflowOperation.operationId;

const connector = {
  id: localWorkflowOperation.connectorId,
  name: 'localWorkflowOperation',
  type: 'Microsoft.Logic/connectionProviders',
  properties: {
    displayName: 'Local workflows (offline)',
    description: 'Browser-local Standard workflow authoring',
    brandColor: '#59B2D9',
    iconUri:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Cpath fill="%2359B2D9" d="M0 0h32v32H0z"/%3E%3Cpath fill="white" d="M12 4h8v8h-3v4h9v4h3v8h-8v-8h3v-2H8v2h3v8H3v-8h3v-4h9v-4h-3z"/%3E%3C/svg%3E',
    capabilities: ['actions'],
  },
};

const dynamicSchema = (isInput: boolean) => ({
  dynamicState: { extension: { operationId: localWorkflowSchemaOperation }, isInput },
  parameters: { name: { parameterReference: 'host.workflow.id', required: true } },
});

const normalizeLocalDisplaySchema = (schema: OpenAPIV2.SchemaObject): OpenAPIV2.SchemaObject => {
  const displaySchema = { ...schema };
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    const concreteTypes = schema.type.filter((type) => type !== 'null');
    if (concreteTypes.length === 1) {
      // SchemaProcessor otherwise emits duplicate token keys, with the null token replacing the concrete type.
      displaySchema.type = concreteTypes[0];
      displaySchema['x-nullable'] = true;
    }
  }
  if (schema.properties) {
    displaySchema.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, property]) => [name, normalizeLocalDisplaySchema(property)])
    );
  }
  if (Array.isArray(schema.items)) {
    displaySchema.items = schema.items.map(normalizeLocalDisplaySchema);
  } else if (schema.items && typeof schema.items === 'object') {
    displaySchema.items = normalizeLocalDisplaySchema(schema.items);
  }
  return displaySchema;
};

export const localWorkflowManifest: OperationManifest = {
  properties: {
    connector,
    iconUri: connector.properties.iconUri,
    brandColor: connector.properties.brandColor,
    summary: 'Invoke a local workflow',
    description: 'Offline local authoring only. This workflow is not deployed or executable in this browser.',
    inputsLocation: ['inputs'],
    inputs: {
      type: 'object',
      required: ['host', 'body'],
      properties: {
        host: {
          type: 'object',
          required: ['workflow'],
          properties: {
            workflow: {
              type: 'object',
              required: ['id'],
              properties: { id: { type: 'string', title: 'Workflow name' } },
            },
          },
        },
        body: {
          title: 'Request body',
          'x-ms-dynamic-properties': dynamicSchema(true),
        },
      },
    },
    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Response body',
          'x-ms-dynamic-properties': dynamicSchema(false),
        },
        statusCode: { type: 'integer', title: 'Status code' },
        headers: { type: 'object', title: 'Headers' },
      },
    },
    isInputsOptional: false,
    isOutputsOptional: false,
    includeRootOutputs: true,
    settings: {},
  },
};

export class LocalWorkflowManifestService extends StandardOperationManifestService {
  constructor(
    options: ConstructorParameters<typeof StandardOperationManifestService>[0],
    private readonly registry: LocalWorkflowRegistry = localWorkflowRegistry
  ) {
    super(options);
  }

  override async getOperationInfo(definition: LogicAppsV2.OperationDefinition, isTrigger: boolean) {
    const workflowId =
      definition.type?.toLowerCase() === 'workflow' && 'inputs' in definition ? definition.inputs?.host?.workflow?.id : undefined;
    return typeof workflowId === 'string' && this.registry.isLocalWorkflowReference(workflowId)
      ? localWorkflowOperation
      : super.getOperationInfo(definition, isTrigger);
  }

  override async getOperationManifest(connectorId: string, operationId: string) {
    return isLocalOperation(connectorId, operationId) ? localWorkflowManifest : super.getOperationManifest(connectorId, operationId);
  }

  override async getOperation(connectorId: string, operationId: string, useCachedData = false) {
    return isLocalOperation(connectorId, operationId)
      ? { properties: localWorkflowManifest.properties }
      : super.getOperation(connectorId, operationId, useCachedData);
  }

  override isBuiltInConnector(connectorId: string): boolean {
    return connectorId.toLowerCase() === localWorkflowOperation.connectorId || super.isBuiltInConnector(connectorId);
  }

  override getBuiltInConnector(connectorId: string) {
    return connectorId.toLowerCase() === localWorkflowOperation.connectorId ? connector : super.getBuiltInConnector(connectorId);
  }
}

export const createLocalWorkflowConnectorService = (httpClient: IHttpClient, registry: LocalWorkflowRegistry) =>
  new StandardConnectorService({
    baseUrl: '/url',
    apiVersion: '2018-11-01',
    httpClient,
    getConfiguration: async () => ({}),
    clientSupportedOperations: [localWorkflowOperation],
    valuesClient: {},
    schemaClient: {
      [localWorkflowSchemaOperation]: async ({ parameters, isInput }) =>
        normalizeLocalDisplaySchema(registry.schema(parameters.name, !!isInput)),
    },
  });
