import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '../httpClient';
import { InitLoggerService } from '../logger';
import { StandardSearchService } from '../standard/search';
import { ConsumptionSearchService } from '../consumption/search';
import { StandardRunService } from '../standard/run';
import { ConsumptionRunService } from '../consumption/run';
import { azureOperationsResponse } from './__mocks__/azureOperationResponse';
import { AzureConnectorMock } from './__mocks__/azureConnectorResponse';
import { almostAllBuiltInOperations } from './__mocks__/builtInOperationResponse';
import { connectorsSearchResultsMock } from '../../../utils/src/lib/mocks/connectorsSearchResultsMock';
import { inputsResponse, outputsResponse } from './__mocks__/monitoringInputsOutputsResponse';

describe('development service fixtures', () => {
  let httpClient: IHttpClient;

  beforeEach(() => {
    InitLoggerService([]);
    httpClient = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), dispose: vi.fn() };
  });

  it('preserves search fixtures and pagination without requesting the API', async () => {
    const search = new StandardSearchService({
      apiVersion: 'test',
      baseUrl: '/runtime',
      apiHubServiceDetails: { apiVersion: 'test', subscriptionId: 'sub', location: 'test' },
      httpClient,
      isDev: true,
      devData: {
        azureOperations: azureOperationsResponse,
        azureConnectors: AzureConnectorMock.value,
        builtInOperations: almostAllBuiltInOperations,
        builtInConnectors: connectorsSearchResultsMock,
      },
    });

    expect(await search.getAllAzureOperations()).toEqual(azureOperationsResponse);
    expect(await search.getAzureOperationsByPage(0)).toEqual(azureOperationsResponse);
    expect(await search.getAzureOperationsByPage(1)).toEqual([]);
    expect(await search.getAllAzureConnectors()).toHaveLength(AzureConnectorMock.value.length);
    expect(await search.getAzureConnectorsByPage(0)).toEqual(await search.getAllAzureConnectors());
    expect(await search.getAzureConnectorsByPage(1)).toEqual([]);
    expect((await search.getBuiltInOperations()).slice(0, almostAllBuiltInOperations.length)).toEqual(almostAllBuiltInOperations);
    expect((await search.getBuiltInConnectors()).slice(0, connectorsSearchResultsMock.length)).toEqual(connectorsSearchResultsMock);
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it.each(['standard', 'consumption'] as const)('preserves %s run fixtures and missing-node defaults', async (kind) => {
    const options = {
      apiVersion: 'test',
      baseUrl: '/runtime',
      httpClient,
      isDev: true,
      devData: { inputs: inputsResponse, outputs: outputsResponse },
    };
    const run =
      kind === 'standard'
        ? new StandardRunService({ ...options, workflowName: 'workflow' })
        : new ConsumptionRunService({ ...options, workflowId: 'workflow' });

    expect(await run.getActionLinks({}, 'Initialize_variable')).toMatchObject({
      inputs: { variables: [{ name: 'var1', type: 'Integer', value: 1 }] },
    });
    expect(await run.getActionLinks({}, 'missing')).toEqual({ inputs: {}, outputs: {} });
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('uses caller-provided development data for consumption Azure search', async () => {
    const search = new ConsumptionSearchService({
      apiHubServiceDetails: { apiVersion: 'test', subscriptionId: 'sub', location: 'test' },
      httpClient,
      isDev: true,
      devData: { azureOperations: [], azureConnectors: [] },
    });

    expect(await search.getAllAzureOperations()).toEqual([]);
    expect(await search.getAllAzureConnectors()).toEqual([]);
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it('reports missing search development data instead of silently returning fixtures or empty results', async () => {
    const search = new StandardSearchService({
      apiVersion: 'test',
      baseUrl: '/runtime',
      apiHubServiceDetails: { apiVersion: 'test', subscriptionId: 'sub', location: 'test' },
      httpClient,
      isDev: true,
    });

    await expect(search.getAllAzureOperations()).rejects.toThrow('devData.azureOperations');
    await expect(search.getBuiltInOperations()).rejects.toThrow('devData.builtInOperations');
  });

  it.each(['standard', 'consumption'] as const)('reports missing %s run development data', async (kind) => {
    const options = { apiVersion: 'test', baseUrl: '/runtime', httpClient, isDev: true };
    const run =
      kind === 'standard'
        ? new StandardRunService({ ...options, workflowName: 'workflow' })
        : new ConsumptionRunService({ ...options, workflowId: 'workflow' });

    await expect(run.getActionLinks({}, 'node')).rejects.toThrow('Run service devData is required');
  });

  it.each(['standard', 'consumption'] as const)('returns caller-supplied %s run payloads of any JSON shape', async (kind) => {
    const options = {
      apiVersion: 'test',
      baseUrl: '/runtime',
      httpClient,
      isDev: true,
      devData: { inputs: { node: 'text' }, outputs: { node: [1, 2] } },
    };
    const run =
      kind === 'standard'
        ? new StandardRunService({ ...options, workflowName: 'workflow' })
        : new ConsumptionRunService({ ...options, workflowId: 'workflow' });

    expect(await run.getActionLinks({}, 'node')).toEqual({ inputs: 'text', outputs: [1, 2] });
  });

  it('uses the API rather than fixture data outside development', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ value: [] });
    const search = new StandardSearchService({
      apiVersion: 'test',
      baseUrl: '/runtime',
      apiHubServiceDetails: { apiVersion: 'test', subscriptionId: 'sub', location: 'test' },
      httpClient,
      devData: {
        azureOperations: azureOperationsResponse,
        azureConnectors: AzureConnectorMock.value,
        builtInOperations: almostAllBuiltInOperations,
        builtInConnectors: connectorsSearchResultsMock,
      },
    });

    expect(await search.getAzureOperationsByPage(0)).toEqual([]);
    expect(await search.getAzureConnectorsByPage(0)).toEqual([]);
    await search.getBuiltInOperations();
    await search.getBuiltInConnectors();
    expect(httpClient.get).toHaveBeenCalledTimes(4);
  });
});
