import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitWorkflowService, StaticResultService, SwaggerParser } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import * as connections from '../../../queries/connections';
import { updateErrorDetails } from '../../../state/operation/operationMetadataSlice';
import { processPathInputs } from '../inputsbuilder';
import { getOperationIdFromDefinition, initializeOperationDetailsForSwagger } from '../operation';

describe('codeful connector paths', () => {
  const connectorId = '/subscriptions/sub/providers/Microsoft.Web/locations/westus/managedApis/msnweather';
  const createSwagger = () =>
    new SwaggerParser({
      swagger: '2.0',
      info: { title: 'Weather', version: '1.0' },
      paths: {
        '/current/{Location}': {
          get: {
            operationId: 'CurrentWeather',
            parameters: [{ name: 'Location', in: 'path', required: true, type: 'string' }],
            responses: { '200': { description: 'Weather', schema: { type: 'object', properties: { temperature: { type: 'number' } } } } },
          },
          post: { operationId: 'UpdateWeather', responses: { '200': { description: 'Updated' } } },
        },
        '/current/{Location}/forecast': {
          get: { operationId: 'Forecast', responses: { '200': { description: 'Forecast' } } },
        },
      },
    });

  beforeEach(() => {
    InitWorkflowService({ getCallbackUrl: vi.fn() });
    vi.spyOn(StaticResultService(), 'getOperationResultSchema').mockResolvedValue(undefined);
    const parsedSwagger = createSwagger();
    vi.spyOn(connections, 'getSwaggerForConnector').mockResolvedValue(parsedSwagger);
    vi.spyOn(connections, 'getConnectorWithSwagger').mockResolvedValue({
      parsedSwagger,
      connector: { id: connectorId, name: 'msnweather', type: 'managedApis', properties: { displayName: 'Weather', iconUri: '' } },
    });
  });

  it.each([
    ['#{"/current/" + (encodeURIComponent("98058"))}', '#{encodeURIComponent("98058")}'],
    [
      '#{"/current/" + (encodeURIComponent(encodeURIComponent(body("Source")["a/b"].ToString())))}',
      '#{encodeURIComponent(encodeURIComponent(body("Source")["a/b"].ToString()))}',
    ],
    ['#{"/current/" + (encodeURIComponent("literal @{toUpper(\'text\')}"))}', '#{encodeURIComponent("literal @{toUpper(\'text\')}")}'],
    [
      String.raw`#{"/current/" + (encodeURIComponent($"""{string.Concat("""hello)""")}tail"""))}`,
      String.raw`#{encodeURIComponent($"""{string.Concat("""hello)""")}tail""")}`,
    ],
    ['/current/98058', '98058'],
    ["/current/@{encodeURIComponent('98058')}", "@{encodeURIComponent('98058')}"],
  ])('initializes complete action details for %s without rewriting the definition', async (path, value) => {
    const operation: LogicAppsV2.ApiConnectionAction = {
      type: 'ApiConnection',
      inputs: { method: 'get', path, host: { connection: { referenceName: 'weather' } } },
      runAfter: {},
    };
    const original = JSON.stringify(operation);
    const dispatch = vi.fn();
    const result = await initializeOperationDetailsForSwagger(
      'action_53154664',
      operation,
      { weather: { api: { id: connectorId }, connection: { id: 'weather' } } },
      false,
      'stateful',
      dispatch
    );

    expect(dispatch.mock.calls.filter(([action]) => updateErrorDetails.match(action))).toEqual([]);
    expect(result).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ id: 'action_53154664', operationId: 'CurrentWeather', connectorId }) })
    );
    expect(result?.[0].nodeInputs?.parameterGroups.default.rawInputs?.find((parameter) => parameter.name === 'Location')?.value).toBe(
      value
    );
    if (path.startsWith('#{')) {
      expect(
        result?.[0].nodeInputs?.parameterGroups.default.parameters
          .find((parameter) => parameter.parameterName === 'Location')
          ?.value.map((segment) => segment.value)
          .join('')
      ).toBe(value);
    }
    expect(JSON.stringify(operation)).toBe(original);
  });

  it('maps multiple encoded parameters without leaking placeholders or splitting C# strings on slashes', () => {
    expect(
      processPathInputs(
        '#{"/datasets/" + (encodeURIComponent(encodeURIComponent("https://example.com"))) + "/tables/" + (encodeURIComponent("a/b")) + "/items"}',
        '/datasets/{dataset}/tables/{table}/items'
      )
    ).toEqual({
      dataset: '#{encodeURIComponent(encodeURIComponent("https://example.com"))}',
      table: '#{encodeURIComponent("a/b")}',
    });
  });

  it('supports parameter prefixes, suffixes and multiple parameters in a single path section', () => {
    expect(
      processPathInputs(
        '#{"/files/prefix-" + (encodeURIComponent("one")) + "-" + (encodeURIComponent("two")) + ".json"}',
        '/files/prefix-{first}-{second}.json'
      )
    ).toEqual({ first: '#{encodeURIComponent("one")}', second: '#{encodeURIComponent("two")}' });
    expect(processPathInputs('#{"/files/prefix-" + (encodeURIComponent("one")) + ".json"}', '/files/prefix-{id}.json')).toEqual({
      id: '#{encodeURIComponent("one")}',
    });
  });

  it('still selects by both HTTP method and complete path', () => {
    const path = '#{"/current/" + (encodeURIComponent("98058"))}';
    expect(getOperationIdFromDefinition({ method: 'post', path }, createSwagger())).toBe('UpdateWeather');
    expect(
      getOperationIdFromDefinition({ method: 'get', path: '#{"/current/" + (encodeURIComponent("98058")) + "/forecast"}' }, createSwagger())
    ).toBe('Forecast');
    expect(getOperationIdFromDefinition({ method: 'delete', path }, createSwagger())).toBeUndefined();
  });

  it.each([
    '#{"/current/" + (encodeURIComponent("unfinished))}',
    '#{"/current/" + (encodeURIComponent(/* unfinished))}',
    '#{"/other/" + (encodeURIComponent("98058"))}',
    '#{"/current/" + (encodeURIComponent("one")) + (encodeURIComponent("two"))}',
  ])('retains the existing error path for malformed or mismatched definitions: %s', (path) => {
    expect(() => processPathInputs(path, '/current/{Location}')).toThrow();
  });
});
