/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchExpectedMd5 } from '../integrity';

vi.mock('axios');

describe('fetchExpectedMd5', () => {
  const mockedHead = vi.mocked(axios.head);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues the HEAD request with a short 4s timeout so a stalled CDN can never hang activation', async () => {
    mockedHead.mockResolvedValue({ headers: { 'content-md5': 'abc123' } } as any);

    const result = await fetchExpectedMd5('https://cdn.example/bundle.zip');

    expect(result).toBe('abc123');
    expect(mockedHead).toHaveBeenCalledWith('https://cdn.example/bundle.zip', expect.objectContaining({ timeout: 4_000 }));
  });

  it('returns undefined when the Content-MD5 header is absent', async () => {
    mockedHead.mockResolvedValue({ headers: {} } as any);

    const result = await fetchExpectedMd5('https://cdn.example/bundle.zip');

    expect(result).toBeUndefined();
  });

  it('propagates the request error so callers can fall back to the cached bundle', async () => {
    mockedHead.mockRejectedValue(new Error('socket disconnected'));

    await expect(fetchExpectedMd5('https://cdn.example/bundle.zip')).rejects.toThrow('socket disconnected');
  });
});
