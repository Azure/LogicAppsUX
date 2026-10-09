import { describe, expect, it, vi } from 'vitest';
import { BaseCognitiveServiceService } from '../cognitiveService';
import type { IHttpClient } from '../../httpClient';

const createHttpClient = (get: ReturnType<typeof vi.fn>) => ({ get }) as unknown as IHttpClient;

describe('BaseCognitiveServiceService', () => {
  it('returns an empty deployment list on failure by default', async () => {
    const error = new Error('ARM request failed');
    const service = new BaseCognitiveServiceService({
      apiVersion: '2024-10-01',
      baseUrl: 'https://management.azure.com',
      httpClient: createHttpClient(vi.fn().mockRejectedValue(error)),
    });

    await expect(service.fetchAllCognitiveServiceAccountDeployments('/subscriptions/sub1/providers/accounts/openai')).resolves.toEqual([]);
  });

  it('propagates deployment retrieval failures when requested', async () => {
    const error = new Error('ARM request failed');
    const service = new BaseCognitiveServiceService({
      apiVersion: '2024-10-01',
      baseUrl: 'https://management.azure.com',
      httpClient: createHttpClient(vi.fn().mockRejectedValue(error)),
    });

    await expect(
      service.fetchAllCognitiveServiceAccountDeployments('/subscriptions/sub1/providers/accounts/openai', { throwOnError: true })
    ).rejects.toBe(error);
  });
});
