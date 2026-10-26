// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  standardManagementOperations,
  SyntheticStandardManagementHost,
  type SyntheticManagementEvent,
  type SyntheticManagementIdentity,
} from './standardManagementHost';

describe('headless synthetic Standard management host', () => {
  let host: SyntheticStandardManagementHost;
  let events: SyntheticManagementEvent[];

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network is forbidden in this host')))
    );
    events = [];
    host = new SyntheticStandardManagementHost((event) => events.push(event));
  });
  afterEach(() => {
    host.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function channels(): string[] {
    return events.map((event) => event.channel);
  }

  it('is default-off and does not issue, use network, or persist credentials', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await host.execute('run.list');
    expect(channels()).toEqual(['ARM']);
    expect(fetch).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it.each(standardManagementOperations)('dispatches %s through the real composed Standard services', async (operation) => {
    await host.setEnabled(true);
    await host.execute(operation);
    expect(channels()).toEqual(['issuer', 'direct']);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(events)).not.toContain('Bearer');
    expect(JSON.stringify(events)).not.toContain('extensionCode');
  });

  it('shares one Contributor session across invocation, metadata, run history and inventory', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await host.setEnabled(true);
    await host.execute('connector.invoke');
    await host.execute('connector.operation.get');
    await host.execute('run.list');
    await host.execute('workflow.runtimeList');
    expect(channels()).toEqual(['issuer', 'direct', 'direct', 'direct', 'direct']);
    expect(storage).not.toHaveBeenCalled();
  });

  it('retains disabled routing until an explicit positive gate refresh', async () => {
    await host.setEnabled(true);
    host.scenario = 'direct-disabled';
    await host.execute('run.cancel');
    await host.execute('run.list');
    expect(channels()).toEqual(['issuer', 'direct', 'ARM', 'ARM']);
    await host.setEnabled(false);
    host.scenario = 'healthy';
    await host.setEnabled(true);
    await host.execute('run.list');
    expect(channels()).toEqual(['issuer', 'direct', 'ARM', 'ARM', 'issuer', 'direct']);
  });

  it.each(['app', 'tenant', 'account', 'authority'] as const)('rebinds services and clears sessions when %s changes', async (field) => {
    await host.setEnabled(true);
    await host.execute('run.list');
    const identity: SyntheticManagementIdentity = { app: 'one', tenant: 'one', account: 'one', authority: 'one' };
    host.setIdentity({ ...identity, [field]: 'two' });
    await host.execute('run.list');
    expect(channels()).toEqual(['issuer', 'direct', 'issuer', 'direct']);
  });

  it('coalesces concurrent reads and rejects pending issuance after sign-out', async () => {
    await host.setEnabled(true);
    host.holdIssuance = true;
    const work = Promise.all([host.execute('run.list'), host.execute('connector.group.list')]);
    const rejection = expect(work).rejects.toThrow(/context/i);
    await vi.waitFor(() => expect(channels()).toEqual(['issuer']));
    host.signOut();
    host.releaseIssuance();
    await rejection;
    expect(channels()).toEqual(['issuer']);
  });

  it.each([
    ['issuer503', 'run.cancel', true],
    ['direct-disabled', 'run.cancel', true],
    ['storage503', 'run.cancel', false],
    ['forbidden', 'run.cancel', false],
    ['forbidden', 'trigger.resubmit', false],
    ['throttled', 'run.cancel', false],
    ['ambiguous', 'run.cancel', false],
    ['unsafe-endpoint', 'run.list', true],
  ] as const)('exercises %s from actual %s entrypoint without unsafe replay', async (scenario, operation, fallback) => {
    await host.setEnabled(true);
    host.scenario = scenario;
    if (fallback) {
      await host.execute(operation);
    } else {
      await expect(host.execute(operation)).rejects.toBeDefined();
    }
    expect(channels().filter((channel) => channel === 'ARM')).toHaveLength(fallback ? 1 : 0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reuses the session during operation-driven parallel renewal without an idle timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T18:00:00Z'));
    await host.setEnabled(true);
    await host.execute('run.list');
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(Date.now() + 240_000);
    host.holdIssuance = true;
    await host.execute('run.list');
    expect(channels()).toEqual(['issuer', 'direct', 'issuer', 'direct']);
    expect(vi.getTimerCount()).toBe(0);
    await host.execute('run.get');
    expect(channels().filter((channel) => channel === 'issuer')).toHaveLength(2);
    host.releaseIssuance();
    await Promise.resolve();
  });

  it.each([
    ['forbidden', 403, 'RequestUnauthorized'],
    ['throttled', 429, 'DirectAccessRequestThrottled'],
  ] as const)('preserves backend error contracts for %s without ARM replay', async (scenario, status, code) => {
    vi.useFakeTimers();
    await host.setEnabled(true);
    host.scenario = scenario;
    const error = await host.execute('run.cancel').catch((error: unknown) => error);
    expect(error).toMatchObject({ status, error: { code, message: 'Synthetic fixture failure.', target: 'sessionToken' } });
    expect(error).not.toHaveProperty('phase');
    expect(channels()).toEqual(['issuer', 'direct']);
    if (scenario === 'throttled') {
      await expect(host.execute('run.cancel')).rejects.toBe(error);
      expect(error).toMatchObject({ headers: { 'Retry-After': '1' } });
      expect(channels()).toEqual(['issuer', 'direct']);
      vi.advanceTimersByTime(1000);
      await expect(host.execute('run.cancel')).rejects.toMatchObject({ status, error: { code } });
      expect(channels()).toEqual(['issuer', 'direct', 'direct']);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('coalesces successful held acquisitions across real services', async () => {
    await host.setEnabled(true);
    host.holdIssuance = true;
    const work = Promise.all([host.execute('run.list'), host.execute('connector.group.list')]);
    await vi.waitFor(() => expect(channels()).toEqual(['issuer']));
    host.releaseIssuance();
    await work;
    expect(channels()).toEqual(['issuer', 'direct', 'direct']);
  });

  it('preserves a valid token on a transient renewal failure through run service entrypoints', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T18:00:00Z'));
    await host.setEnabled(true);
    await host.execute('run.list');
    host.scenario = 'issuer503';
    vi.setSystemTime(Date.now() + 240_000);
    await host.execute('run.get');
    await host.execute('run.list');
    expect(channels()).toEqual(['issuer', 'direct', 'issuer', 'direct', 'direct']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases held fixture work on disposal without dispatching late business work', async () => {
    await host.setEnabled(true);
    host.holdIssuance = true;
    const work = host.execute('run.list');
    const rejection = expect(work).rejects.toThrow(/context/i);
    await vi.waitFor(() => expect(channels()).toEqual(['issuer']));
    host.dispose();
    await rejection;
    expect(channels()).toEqual(['issuer']);
  });
});
