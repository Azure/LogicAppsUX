import { applySettingDefaults, fetchSettingDefaults, getSupportedSettingKeys, mergeSettingDefaults } from '../settingDefaults';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { InitExperimentationServiceService, InitOperationManifestService } from '@microsoft/logic-apps-shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Settings } from '../../actions/bjsworkflow/settings';

describe('settingDefaults', () => {
  beforeEach(() => {
    // Each test gets a clean query cache so the dedupe assertions are deterministic.
    getReactQueryClient().clear();
  });

  describe('getSupportedSettingKeys', () => {
    it('returns only keys whose isSupported is true', () => {
      const settings = {
        retryPolicy: { isSupported: true, value: undefined },
        timeout: { isSupported: false },
        secureInputs: { isSupported: true, value: false },
      } as unknown as Settings;

      expect(getSupportedSettingKeys(settings).sort()).toEqual(['retryPolicy', 'secureInputs']);
    });

    it('ignores non-object entries', () => {
      const settings = {
        sequential: true,
        singleInstance: false,
        timeout: { isSupported: true },
      } as unknown as Settings;

      expect(getSupportedSettingKeys(settings)).toEqual(['timeout']);
    });
  });

  describe('mergeSettingDefaults', () => {
    it('applies and locks read-only known settings', () => {
      const settings = { secureInputs: { isSupported: true, value: undefined } } as unknown as Settings;

      const merged = mergeSettingDefaults(settings, { secureInputs: { value: true, readOnly: true } });

      expect(merged.secureInputs).toEqual({ isSupported: true, value: true, readOnly: true });
    });

    it('applies an editable default only when the value is unset', () => {
      const unset = { timeout: { isSupported: true, value: undefined } } as unknown as Settings;
      expect(mergeSettingDefaults(unset, { timeout: { value: 'PT1H' } }).timeout?.value).toBe('PT1H');

      const userSet = { timeout: { isSupported: true, value: 'PT5M' } } as unknown as Settings;
      expect(mergeSettingDefaults(userSet, { timeout: { value: 'PT1H' } }).timeout?.value).toBe('PT5M');
    });

    it('sets defaultHint when applying a default retry policy', () => {
      const settings = { retryPolicy: { isSupported: true, value: { type: 'default' } } } as unknown as Settings;
      const apiValue = { type: 'default', count: 4, interval: 'PT20S' };

      const merged = mergeSettingDefaults(settings, { retryPolicy: { value: apiValue } });

      expect(merged.retryPolicy?.value).toEqual(apiValue);
      expect(merged.retryPolicy?.defaultHint).toEqual(apiValue);
    });

    it('does not set defaultHint for a non-default retry policy', () => {
      const settings = {
        retryPolicy: { isSupported: true, value: { type: 'fixed', count: 2 } },
      } as unknown as Settings;

      const merged = mergeSettingDefaults(settings, { retryPolicy: { value: { type: 'fixed', count: 9 } } });

      // User already has a non-default, non-null value, so nothing is applied.
      expect(merged.retryPolicy?.value).toEqual({ type: 'fixed', count: 2 });
      expect(merged.retryPolicy?.defaultHint).toBeUndefined();
    });

    it('routes unknown keys into hostSettings', () => {
      const merged = mergeSettingDefaults({} as Settings, {
        someHostKnob: { value: 10, readOnly: true },
        anotherKnob: { value: 'abc', readOnly: false },
      });

      expect(merged.hostSettings?.someHostKnob).toEqual({ isSupported: true, value: 10, readOnly: true });
      expect(merged.hostSettings?.anotherKnob).toEqual({ isSupported: true, value: 'abc', readOnly: false });
    });

    it('skips unsupported known settings', () => {
      const settings = { timeout: { isSupported: false } } as unknown as Settings;

      const merged = mergeSettingDefaults(settings, { timeout: { value: 'PT1H' } });

      expect(merged.timeout).toEqual({ isSupported: false });
    });

    it('does not add hostSettings when there are no unknown keys', () => {
      const settings = { timeout: { isSupported: true, value: undefined } } as unknown as Settings;

      const merged = mergeSettingDefaults(settings, { timeout: { value: 'PT1H' } });

      expect(merged.hostSettings).toBeUndefined();
    });
  });

  describe('fetchSettingDefaults', () => {
    it('returns undefined when the service does not implement getSettingDefaults', async () => {
      InitOperationManifestService({} as any);

      expect(await fetchSettingDefaults('connector', 'operation', ['timeout'])).toBeUndefined();
    });

    it('returns undefined when there are no supported settings', async () => {
      const spy = vi.fn();
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      expect(await fetchSettingDefaults('connector', 'operation', [])).toBeUndefined();
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns undefined when the service throws', async () => {
      InitOperationManifestService({
        getSettingDefaults: vi.fn().mockRejectedValue(new Error('boom')),
      } as any);

      expect(await fetchSettingDefaults('connector', 'operation', ['timeout'])).toBeUndefined();
    });

    it('returns the fetched defaults', async () => {
      InitOperationManifestService({
        getSettingDefaults: vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } }),
      } as any);

      expect(await fetchSettingDefaults('connector', 'operation', ['timeout'])).toEqual({ timeout: { value: 'PT1H' } });
    });

    it('dedupes concurrent fetches with the same case-insensitive cache key', async () => {
      const spy = vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      await fetchSettingDefaults('Connector', 'Operation', ['timeout'], 'stateful');
      await fetchSettingDefaults('connector', 'operation', ['timeout'], 'stateful');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not dedupe across different workflow kinds', async () => {
      const spy = vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      await fetchSettingDefaults('connector', 'operation', ['timeout'], 'stateful');
      await fetchSettingDefaults('connector', 'operation', ['timeout'], 'stateless');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('does not dedupe across different supported setting lists', async () => {
      const spy = vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      await fetchSettingDefaults('connector', 'operation', ['timeout'], 'stateful');
      await fetchSettingDefaults('connector', 'operation', ['timeout', 'retryPolicy'], 'stateful');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('dedupes regardless of supported setting order', async () => {
      const spy = vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      await fetchSettingDefaults('connector', 'operation', ['timeout', 'retryPolicy'], 'stateful');
      await fetchSettingDefaults('connector', 'operation', ['retryPolicy', 'timeout'], 'stateful');

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('applySettingDefaults', () => {
    beforeEach(() => {
      // applySettingDefaults is gated behind the experimentation flag; enable it by default so the
      // fetch/merge behavior is exercised. Individual tests override this to assert the gate.
      InitExperimentationServiceService({ isFeatureEnabled: vi.fn().mockResolvedValue(true), getFeatureValue: vi.fn() } as any);
    });

    it('returns the settings unchanged when there are no fetched defaults', async () => {
      InitOperationManifestService({} as any);

      const settings = { timeout: { isSupported: true, value: 'PT5M' } } as unknown as Settings;

      const result = await applySettingDefaults(settings, 'connector', 'operation', 'stateful');

      expect(result).toBe(settings);
    });

    it('merges fetched defaults into the settings', async () => {
      InitOperationManifestService({
        getSettingDefaults: vi.fn().mockResolvedValue({ timeout: { value: 'PT1H' } }),
      } as any);

      const settings = { timeout: { isSupported: true, value: undefined } } as unknown as Settings;

      const result = await applySettingDefaults(settings, 'connector', 'operation', 'stateful');

      expect(result.timeout?.value).toBe('PT1H');
    });

    it('skips the fetch entirely for operation types with no retry policy', async () => {
      const spy = vi.fn();
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      const settings = { timeout: { isSupported: true, value: 'PT5M' } } as unknown as Settings;

      const result = await applySettingDefaults(settings, 'connector', 'operation', 'stateful', 'Request');

      expect(result).toBe(settings);
      expect(spy).not.toHaveBeenCalled();
    });

    it('forwards the operation type to the service for HTTP-family built-ins', async () => {
      const spy = vi.fn().mockResolvedValue({ retryPolicy: { value: { type: 'default' } } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      const settings = { retryPolicy: { isSupported: true, value: undefined } } as unknown as Settings;

      await applySettingDefaults(settings, 'connectionProviders/http', 'httpaction', 'stateful', 'Http');

      expect(spy).toHaveBeenCalledWith('connectionProviders/http', 'httpaction', ['retryPolicy'], 'stateful', 'Http');
    });

    it('does not fetch when the experimentation flag is disabled', async () => {
      InitExperimentationServiceService({ isFeatureEnabled: vi.fn().mockResolvedValue(false), getFeatureValue: vi.fn() } as any);
      const spy = vi.fn().mockResolvedValue({ retryPolicy: { value: { type: 'default' } } });
      InitOperationManifestService({ getSettingDefaults: spy } as any);

      const settings = { retryPolicy: { isSupported: true, value: undefined } } as unknown as Settings;

      const result = await applySettingDefaults(settings, 'connectionProviders/http', 'httpaction', 'stateful', 'Http');

      expect(result).toBe(settings);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
