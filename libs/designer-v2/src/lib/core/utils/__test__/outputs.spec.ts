import {
  getSplitOnOptions,
  getUpdatedManifestForSchemaDependency,
  getUpdatedManifestForSplitOn,
  isSupportedSplitOnExpression,
  loadDynamicOutputsInNode,
  operationSupportsSplitOn,
  removeAliasingKeyRedundancies,
  toOutputInfo,
  updateOutputsForBatchingTrigger,
} from '../outputs';
import * as initialization from '../../actions/bjsworkflow/initialize';
import { getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { ErrorLevel, addDynamicOutputs, clearDynamicIO, updateErrorDetails } from '../../state/operation/operationMetadataSlice';
import { addDynamicTokens } from '../../state/tokens/tokensSlice';
import { getDynamicOutputsFromSchema, getDynamicSchema } from '../parameters/dynamicdata';
import { convertOutputsToTokens } from '../tokens';
import { ValueSegmentType } from '@microsoft/designer-ui';
import {
  ConnectionReferenceKeyFormat,
  ExpressionParser,
  InitOperationManifestService,
  InitWorkflowService,
  OutputKeys,
  onNewEmail,
} from '@microsoft/logic-apps-shared';
import type { OperationManifest, OutputParameters } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../queries/connections', () => ({
  getConnectorWithSwagger: vi.fn(),
}));

vi.mock('../../queries/operation', () => ({
  getOperationManifest: vi.fn(),
}));

vi.mock('../parameters/dynamicdata', () => ({
  getDynamicOutputsFromSchema: vi.fn(),
  getDynamicSchema: vi.fn(),
}));

vi.mock('../tokens', () => ({
  convertOutputsToTokens: vi.fn(),
}));
describe('Outputs Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    InitOperationManifestService({ isSupported: () => true } as any);
    InitWorkflowService({ isSplitOnSupported: () => true } as any);
    vi.mocked(convertOutputsToTokens).mockReturnValue([]);
  });

  describe('static-schema output initialization', () => {
    const load = () =>
      loadDynamicOutputsInNode(
        'Request',
        true,
        { type: 'Request', connectorId: 'request', operationId: 'request' },
        undefined,
        { body: { dependencyType: 'StaticSchema', definition: {}, dependentParameters: {} } },
        { parameterGroups: {} },
        {},
        {},
        vi.fn()
      );

    it('waits until Request output metadata and tokens have finished loading', async () => {
      let finish!: () => void;
      const initialized = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const update = vi.spyOn(initialization, 'updateOutputsAndTokens').mockReturnValue(initialized);
      const completed = vi.fn();
      const pending = load().then(completed);
      await Promise.resolve();
      expect(update).toHaveBeenCalledOnce();
      expect(completed).not.toHaveBeenCalled();
      finish();
      await pending;
      expect(completed).toHaveBeenCalledOnce();
    });

    it('propagates static-schema initialization failures to the awaiting caller', async () => {
      vi.spyOn(initialization, 'updateOutputsAndTokens').mockRejectedValue(new Error('Request outputs unavailable'));
      await expect(load()).rejects.toThrow('Request outputs unavailable');
    });
  });

  describe('output metadata helpers', () => {
    it('normalizes output metadata and chooses the first available display title', () => {
      expect(
        toOutputInfo({
          key: 'outputs.$.body.id',
          name: 'id',
          type: 'string',
          summary: 'Identifier',
          description: 'Fallback description',
          visibility: 'advanced',
          required: true,
        } as any)
      ).toMatchObject({
        key: 'outputs.$.body.id',
        name: 'id',
        type: 'string',
        title: 'Identifier',
        description: 'Fallback description',
        isAdvanced: true,
        required: true,
      });

      expect(toOutputInfo({ key: 'outputs.$.body.name', name: 'name', type: 'string' } as any).title).toBe('name');
    });

    it('honors workflow split-on support and defaults to enabled when the host omits the capability', () => {
      expect(operationSupportsSplitOn(true)).toBe(true);
      expect(operationSupportsSplitOn(false)).toBe(false);

      InitWorkflowService({ isSplitOnSupported: () => false } as any);
      expect(operationSupportsSplitOn(true)).toBe(false);

      InitWorkflowService({} as any);
      expect(operationSupportsSplitOn(true)).toBe(true);
    });

    it('removes repeated alias path prefixes without changing unrelated segments', () => {
      expect(removeAliasingKeyRedundancies('outputs.$.body.foo.foo/bar.foo/bar/baz')).toBe('outputs.$.body.foo/bar/baz');
      expect(removeAliasingKeyRedundancies('outputs.$.body.foo.bar')).toBe('outputs.$.body.foo.bar');
    });

    it('accepts only zero-argument trigger output expressions with string dereferences', () => {
      expect(isSupportedSplitOnExpression(ExpressionParser.parseTemplateExpression("@triggerBody()?['items']"))).toBe(true);
      expect(isSupportedSplitOnExpression(ExpressionParser.parseTemplateExpression("@triggerOutputs()?['body']"))).toBe(true);
      expect(isSupportedSplitOnExpression(ExpressionParser.parseTemplateExpression("@concat('a', 'b')"))).toBe(false);
      expect(isSupportedSplitOnExpression(ExpressionParser.parseTemplateExpression("@triggerBody('value')"))).toBe(false);
      const nonStringDereference = ExpressionParser.parseTemplateExpression("@triggerBody()?['items']") as any;
      nonStringDereference.dereferences[0].expression = ExpressionParser.parseTemplateExpression("@variables('name')");
      expect(isSupportedSplitOnExpression(nonStringDereference)).toBe(false);
      expect(isSupportedSplitOnExpression({ type: 'StringLiteral', value: 'plain text' } as any)).toBe(false);
    });
  });

  describe('split-on output selection', () => {
    it('returns only the body-level array when the trigger body itself is an array', () => {
      const options = getSplitOnOptions(
        {
          outputs: {
            body: { key: 'body.$', type: 'array', source: 'body', required: true },
            nested: { key: 'body.$.nested', type: 'array', source: 'body', isInsideArray: true },
          },
        } as any,
        false
      );

      expect(options).toEqual(['@triggerBody()']);
    });

    it('filters nested arrays and removes redundant OpenAPI alias segments', () => {
      const options = getSplitOnOptions(
        {
          originalOutputs: {
            items: {
              key: 'outputs.$.body.items.items/value',
              type: 'array',
              source: 'body',
              alias: 'items/value',
              required: false,
            },
            nested: {
              key: 'outputs.$.body.items.child',
              type: 'array',
              source: 'body',
              parentArray: 'items',
            },
            scalar: { key: 'outputs.$.body.name', type: 'string', source: 'body' },
          },
        } as any,
        true
      );

      expect(options).toHaveLength(1);
      expect(options[0]).toContain('triggerOutputs');
      expect(options[0]).toContain('items/value');
    });
  });

  describe('schema-dependent manifest outputs', () => {
    const manifestWithSchemaDependencies = (): OperationManifest =>
      ({
        properties: {
          iconUri: 'icon',
          brandColor: '#000',
          inputs: { type: 'object', properties: {} },
          outputs: {
            type: 'object',
            properties: {
              body: { title: 'Body' },
              tokenBody: { title: 'Token body' },
              relativePathParameters: { type: 'object', title: 'Path parameters' },
            },
          },
          outputsSchema: {
            outputPaths: [
              { outputLocation: ['properties', 'body'], name: 'schema', schema: 'Value' },
              { outputLocation: ['properties', 'tokenBody'], name: 'arrayToken', schema: 'ValueSchema' },
              { outputLocation: ['properties', 'relativePathParameters'], name: 'relativePath', schema: 'UriTemplate' },
            ],
          },
        },
      }) as any;

    it('initializes literal, token, and URI-template output schemas without mutating the manifest', () => {
      const manifest = manifestWithSchemaDependencies();
      const updated = getUpdatedManifestForSchemaDependency(manifest, {
        parameterGroups: {
          default: {
            id: 'default',
            rawInputs: [],
            parameters: [
              {
                parameterName: 'schema',
                value: [
                  {
                    type: ValueSegmentType.LITERAL,
                    value: '{"type":"object","properties":{"name":{"type":"string"}}}',
                  },
                ],
              },
              {
                parameterName: 'arrayToken',
                value: [
                  {
                    type: ValueSegmentType.TOKEN,
                    token: { type: 'array', schema: { type: 'array', items: { type: 'number' } } },
                  },
                ],
              },
              {
                parameterName: 'relativePath',
                value: [{ type: ValueSegmentType.LITERAL, value: '/orders/{orderId}/items/{itemId}' }],
              },
            ],
          },
        },
      } as any);

      expect(updated).not.toBe(manifest);
      expect(manifest.properties.outputs.properties.body.type).toBeUndefined();
      expect(updated.properties.outputs.properties.body).toMatchObject({
        type: 'object',
        properties: { name: { type: 'string' } },
      });
      expect(updated.properties.outputs.properties.tokenBody).toMatchObject({
        type: 'array',
        items: { type: 'number' },
      });
      expect(updated.properties.outputs.properties.relativePathParameters).toMatchObject({
        properties: {
          orderId: { type: 'string', title: 'orderId' },
          itemId: { type: 'string', title: 'itemId' },
        },
        required: ['orderId', 'itemId'],
      });
    });

    it('keeps the original manifest when no output schema dependencies are declared', () => {
      const manifest = manifestWithSchemaDependencies();
      delete manifest.properties.outputsSchema;

      expect(getUpdatedManifestForSchemaDependency(manifest, { parameterGroups: {} } as any)).toBe(manifest);
    });
  });

  describe('batching trigger outputs', () => {
    it('removes the selected split-on array and promotes its children to ordinary body outputs', () => {
      const outputs: OutputParameters = {
        items: { key: 'body.$.items', name: 'items', type: 'array', parentArray: undefined },
        child: { key: 'body.$.items.$.id', name: 'id', type: 'string', parentArray: 'items', isInsideArray: true },
        other: { key: 'body.$.other', name: 'other', type: 'string' },
      } as any;

      const updated = updateOutputsForBatchingTrigger(outputs, "@triggerBody()?['items']");

      expect(updated).not.toHaveProperty('items');
      expect(updated.child.isInsideArray).toBe(false);
      expect(updated).toHaveProperty('other');
    });

    it('returns the original outputs without split-on and handles unsupported expressions as body-level batching', () => {
      const outputs: OutputParameters = {
        child: { key: 'body.$.id', name: 'id', type: 'string', parentArray: OutputKeys.Body, isInsideArray: true },
      } as any;

      expect(updateOutputsForBatchingTrigger(outputs, undefined)).toBe(outputs);
      expect(updateOutputsForBatchingTrigger(outputs, '@invalid(').child.isInsideArray).toBe(false);
    });
  });

  describe('dynamic output initialization', () => {
    const operationInfo = { type: 'ApiConnection', connectorId: '/connectors/demo', operationId: 'GetItems' };
    const readyDependency = {
      dependencyType: 'DynamicSchema',
      definition: {},
      dependentParameters: {},
      parameter: { key: 'outputs.$.body', name: 'body', type: 'object' },
    };

    const load = (outputDependencies: Record<string, any>, dispatch = vi.fn(), settings: any = {}) =>
      loadDynamicOutputsInNode(
        'Get_items',
        false,
        operationInfo,
        undefined,
        outputDependencies,
        { parameterGroups: {} },
        settings,
        {},
        dispatch
      );

    it('loads manifest-based dynamic outputs, applies split-on, and initializes tokens', async () => {
      const dispatch = vi.fn();
      const schemaOutputs: OutputParameters = {
        items: { key: 'body.$.items', name: 'items', type: 'array', source: 'body' },
        itemId: {
          key: 'body.$.items.$.id',
          name: 'id',
          type: 'string',
          source: 'body',
          parentArray: 'items',
          isInsideArray: true,
        },
      } as any;
      vi.mocked(getDynamicSchema).mockResolvedValue({ type: 'object' });
      vi.mocked(getDynamicOutputsFromSchema).mockReturnValue(schemaOutputs);
      vi.mocked(getOperationManifest).mockResolvedValue({
        properties: { iconUri: 'manifest-icon', brandColor: '#123456' },
      } as any);
      vi.mocked(convertOutputsToTokens).mockReturnValue([{ key: 'token' }] as any);

      await load({ body: readyDependency }, dispatch, { splitOn: { value: { enabled: true, value: "@triggerBody()?['items']" } } });

      expect(getDynamicSchema).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenNthCalledWith(1, clearDynamicIO({ nodeId: 'Get_items', inputs: false, outputs: true }));
      expect(dispatch).toHaveBeenNthCalledWith(
        2,
        addDynamicOutputs({
          nodeId: 'Get_items',
          outputs: {
            itemId: expect.objectContaining({ key: 'body.$.items.$.id', isInsideArray: false }),
          },
        })
      );
      expect(convertOutputsToTokens).toHaveBeenCalledWith(
        'Get_items',
        'ApiConnection',
        { itemId: expect.objectContaining({ key: 'body.$.items.$.id' }) },
        { iconUri: 'manifest-icon', brandColor: '#123456' },
        expect.any(Object),
        expect.any(Object)
      );
      expect(dispatch).toHaveBeenNthCalledWith(3, addDynamicTokens({ nodeId: 'Get_items', tokens: [{ key: 'token' }] as any }));
    });

    it('uses connector branding when the operation manifest service does not support the operation', async () => {
      InitOperationManifestService({ isSupported: () => false } as any);
      vi.mocked(getDynamicSchema).mockResolvedValue({ type: 'object' });
      vi.mocked(getDynamicOutputsFromSchema).mockReturnValue({});
      vi.mocked(getConnectorWithSwagger).mockResolvedValue({
        connector: {
          properties: {
            iconUri: 'connector-icon',
            brandColor: '#abcdef',
          },
        },
      } as any);

      await load({ body: readyDependency });

      expect(getOperationManifest).not.toHaveBeenCalled();
      expect(getConnectorWithSwagger).toHaveBeenCalledWith('/connectors/demo');
      expect(convertOutputsToTokens).toHaveBeenCalledWith(
        'Get_items',
        'ApiConnection',
        {},
        { iconUri: 'connector-icon', brandColor: '#abcdef' },
        {},
        { parameterGroups: {} }
      );
    });

    it('skips dependencies whose required inputs are invalid', async () => {
      const dispatch = vi.fn();

      await load(
        {
          body: {
            ...readyDependency,
            dependentParameters: { requiredInput: { isValid: false } },
          },
        },
        dispatch
      );

      expect(dispatch).toHaveBeenCalledExactlyOnceWith(clearDynamicIO({ nodeId: 'Get_items', inputs: false, outputs: true }));
      expect(getDynamicSchema).not.toHaveBeenCalled();
    });

    it('records a dynamic-output error without rejecting the entire initialization', async () => {
      const dispatch = vi.fn();
      const failure = Object.assign(new Error('schema unavailable'), { code: 'DynamicSchemaUnavailable' });
      vi.mocked(getDynamicSchema).mockRejectedValue(failure);

      await expect(load({ body: readyDependency }, dispatch)).resolves.toBeUndefined();

      expect(dispatch).toHaveBeenNthCalledWith(
        2,
        updateErrorDetails({
          id: 'Get_items',
          errorInfo: {
            level: ErrorLevel.DynamicOutputs,
            message: expect.stringContaining('schema unavailable'),
            error: failure,
            code: 'DynamicSchemaUnavailable',
          },
        })
      );
    });
  });

  describe('getUpdatedManifestForSpiltOn', () => {
    it('properly deserializes OpenAPI property aliases', () => {
      const sampleManifest: OperationManifest = {
        properties: {
          iconUri: 'https://example.com/icon.png',
          brandColor: '#4B53BC',
          summary: 'When a new channel message is added',
          inputs: {
            type: 'object',
            properties: {
              groupId: {
                type: 'string',
                title: 'Team',
                'x-ms-dynamic-list': {
                  itemValuePath: 'id',
                  dynamicState: {
                    operationId: 'GetAllTeams',
                    parameters: {},
                    itemsPath: 'value',
                    itemValuePath: 'id',
                    itemTitlePath: 'displayName',
                  },
                  parameters: {},
                },
                description: 'Add team ID',
                minLength: 1,
                'x-ms-property-name-alias': 'groupId',
              },
            },
            required: ['channelId', 'groupId'],
          },
          outputs: {
            type: 'object',
            properties: {
              body: {
                type: 'array',
                title: 'Message List',
                items: {
                  type: 'object',
                  title: 'Message',
                  properties: {
                    importance: {
                      type: 'string',
                      title: 'importance',
                      description: 'importance',
                      'x-ms-visibility': 'advanced',
                      'x-ms-property-name-alias': 'importance',
                    },
                  },
                  required: [],
                  description: 'Properties associated with a single message.',
                },
                description: 'List of one or more messages for a specific channel in a Team.',
                'x-ms-visibility': 'advanced',
                'x-ms-property-name-alias': 'body',
              },
            },
          },
          connectionReference: {
            referenceKeyFormat: ConnectionReferenceKeyFormat.OpenApi,
          },
        },
      };

      const triggerOutputsSplitOn = "@triggerOutputs()?['body']";
      const triggerOutputsSplitOnResult = getUpdatedManifestForSplitOn(sampleManifest, triggerOutputsSplitOn);
      // Ensure the original is not modified.
      expect(sampleManifest.properties.outputs.properties.body.items.properties.importance['x-ms-property-name-alias']).toBe('importance');
      // Ensure non-OpenAPI manifest has the correct format for alias.
      expect(triggerOutputsSplitOnResult.properties.outputs.properties.body.properties.importance['x-ms-property-name-alias']).toBe(
        'body/importance'
      );

      const triggerBodySplitOn = "@triggerBody()?['value']";
      const triggerBodySplitOnResult = getUpdatedManifestForSplitOn(onNewEmail, triggerBodySplitOn);
      // Ensure the original is not modified.
      expect(onNewEmail.properties.outputs.properties.body.properties.value.items.properties.From['x-ms-property-name-alias']).toBe('From');
      // Ensure OpenAPI manifest has the correct format for alias when using SplitOn string starting with triggerBody
      expect(triggerBodySplitOnResult.properties.outputs.properties.body.properties.From['x-ms-property-name-alias']).toBe('body/From');

      const aliasPathSplitOn = "@triggerOutputs()?['body/value']";
      const aliasPathSplitOnResult = getUpdatedManifestForSplitOn(onNewEmail, aliasPathSplitOn);
      // Ensure the original is not modified.
      expect(onNewEmail.properties.outputs.properties.body.properties.value.items.properties.From['x-ms-property-name-alias']).toBe('From');
      // Ensure OpenAPI manifest has the correct alias format when using SplitOn with an alias path format.
      expect(aliasPathSplitOnResult.properties.outputs.properties.body.properties.From['x-ms-property-name-alias']).toBe('body/From');
    });
  });
});
