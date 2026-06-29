import { getRetryPolicy } from '../serializer';
import type { Settings } from '../settings';
import { describe, it, expect } from 'vitest';

describe('getRetryPolicy', () => {
  it('returns undefined when no retry policy value is present', () => {
    expect(getRetryPolicy({} as Settings)).toBeUndefined();
  });

  it('omits the retry policy when the value came from API defaults (defaultHint set)', () => {
    const settings = {
      retryPolicy: {
        isSupported: true,
        value: { type: 'fixed', count: 4, interval: 'PT20S' },
        defaultHint: { type: 'fixed', count: 4, interval: 'PT20S' },
      },
    } as unknown as Settings;

    expect(getRetryPolicy(settings)).toBeUndefined();
  });

  it('serializes a user-set fixed retry policy', () => {
    const settings = {
      retryPolicy: { isSupported: true, value: { type: 'fixed', count: 4, interval: 'PT20S' } },
    } as unknown as Settings;

    expect(getRetryPolicy(settings)).toEqual({ type: 'fixed', count: 4, interval: 'PT20S' });
  });

  it('omits a default-type retry policy', () => {
    const settings = {
      retryPolicy: { isSupported: true, value: { type: 'default' } },
    } as unknown as Settings;

    expect(getRetryPolicy(settings)).toBeUndefined();
  });

  it('serializes a none retry policy', () => {
    const settings = {
      retryPolicy: { isSupported: true, value: { type: 'none' } },
    } as unknown as Settings;

    expect(getRetryPolicy(settings)).toEqual({ type: 'none' });
  });
});
