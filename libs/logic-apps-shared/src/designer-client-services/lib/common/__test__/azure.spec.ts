import { describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '../../httpClient';
import { getAzureResourceRecursive } from '../azure';

const createHttpClient = (get: ReturnType<typeof vi.fn>) => ({ get }) as unknown as IHttpClient;

describe('getAzureResourceRecursive', () => {
  it('returns accumulated resources when a later page fails by default', async () => {
    const error = new Error('ARM request failed');
    const get = vi
      .fn()
      .mockResolvedValueOnce({ value: [{ id: 'deployment-1' }], nextLink: 'next-page' })
      .mockRejectedValueOnce(error);

    await expect(getAzureResourceRecursive(createHttpClient(get), 'first-page', {})).resolves.toEqual([{ id: 'deployment-1' }]);
  });

  it('propagates a page failure when throwOnError is enabled', async () => {
    const error = new Error('ARM request failed');
    const get = vi
      .fn()
      .mockResolvedValueOnce({ value: [{ id: 'deployment-1' }], nextLink: 'next-page' })
      .mockRejectedValueOnce(error);

    await expect(getAzureResourceRecursive(createHttpClient(get), 'first-page', {}, { throwOnError: true })).rejects.toBe(error);
  });
});
