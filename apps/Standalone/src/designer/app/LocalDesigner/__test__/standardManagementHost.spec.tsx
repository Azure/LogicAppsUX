// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StandardManagementTestHost } from '../StandardManagementTestHost';
import { standardManagementOperations, SyntheticStandardManagementHost } from '../standardManagementHost';

describe('Standalone synthetic Standard management host', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network is forbidden in this host')))
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function openHost(): void {
    render(<StandardManagementTestHost />);
    expect(screen.getByText(/synthetic fixtures only/i)).toBeTruthy();
  }

  async function enable(): Promise<void> {
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable synthetic direct management' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('enabled'));
  }

  async function invoke(operation: string): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: operation }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`${operation}: succeeded`));
  }

  it('is default-off and does not issue, use network, or persist credentials', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    openHost();
    await invoke('run.list');
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 0; ARM: 1; direct: 0');
    expect(fetch).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it.each(standardManagementOperations)('dispatches %s through the real host-composed Standard services', async (operation) => {
    openHost();
    await enable();
    await invoke(operation);
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 1; ARM: 0; direct: 1');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('transport-trace').textContent).not.toContain('Bearer');
    expect(screen.getByTestId('transport-trace').textContent).not.toContain('extensionCode');
  });

  it('shares one Contributor session across invocation, metadata, run history and inventory', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    openHost();
    await enable();
    await invoke('connector.invoke');
    await invoke('connector.operation.get');
    await invoke('run.list');
    await invoke('workflow.runtimeList');
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 1; ARM: 0; direct: 4');
    expect(storage).not.toHaveBeenCalled();
  });

  it('retains disabled routing until a positive gate refresh through the host control', async () => {
    openHost();
    await enable();
    fireEvent.change(screen.getByRole('combobox', { name: 'Scenario' }), { target: { value: 'direct-disabled' } });
    await invoke('run.cancel');
    await invoke('run.list');
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 1; ARM: 2; direct: 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable synthetic direct management' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('disabled'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Scenario' }), { target: { value: 'healthy' } });
    await enable();
    await invoke('run.list');
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 2; ARM: 2; direct: 2');
  });

  it.each(['App', 'Tenant', 'Account', 'Authority'])('rebinds all services and clears sessions when %s changes', async (field) => {
    openHost();
    await enable();
    await invoke('run.list');
    fireEvent.change(screen.getByRole('combobox', { name: field }), { target: { value: 'two' } });
    await invoke('run.list');
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 2; ARM: 0; direct: 2');
  });

  it('coalesces real concurrent reads and rejects pending issuance after sign-out', async () => {
    openHost();
    await enable();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hold issuance' }));
    fireEvent.click(screen.getByRole('button', { name: 'run.list' }));
    fireEvent.click(screen.getByRole('button', { name: 'connector.group.list' }));
    await waitFor(() => expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 1; ARM: 0; direct: 0'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Release issuance' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('context'));
    expect(screen.getByTestId('transport-counts').textContent).toBe('issuer: 1; ARM: 0; direct: 0');
  });

  it('disposes the owner on route teardown and prevents late business dispatch', async () => {
    const disposed = vi.spyOn(SyntheticStandardManagementHost.prototype, 'dispose');
    const view = render(<StandardManagementTestHost />);
    await enable();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hold issuance' }));
    fireEvent.click(screen.getByRole('button', { name: 'run.list' }));
    await waitFor(() => expect(screen.getByTestId('transport-counts').textContent).toContain('issuer: 1'));
    view.unmount();
    expect(disposed).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['issuer503', 'run.cancel', true],
    ['direct-disabled', 'run.cancel', true],
    ['storage503', 'run.cancel', false],
    ['forbidden', 'run.cancel', false],
    ['forbidden', 'trigger.resubmit', false],
    ['throttled', 'run.cancel', false],
    ['ambiguous', 'run.cancel', false],
    ['unsafe-endpoint', 'run.list', false],
  ])('exercises %s from actual %s entrypoint without unsafe replay', async (scenario, operation, fallback) => {
    openHost();
    await enable();
    fireEvent.change(screen.getByRole('combobox', { name: 'Scenario' }), { target: { value: scenario } });
    fireEvent.click(screen.getByRole('button', { name: operation }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(fallback ? 'succeeded' : 'failed'));
    expect(screen.getByTestId('transport-counts').textContent).toContain(`ARM: ${fallback ? 1 : 0}`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reuses the tab session during operation-driven parallel renewal without an idle timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T18:00:00Z'));
    const events: string[] = [];
    const host = new SyntheticStandardManagementHost((event) => events.push(event.channel));
    await host.setEnabled(true);
    await host.execute('run.list');
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(Date.now() + 240_000);
    host.holdIssuance = true;
    await host.execute('run.list');
    expect(events).toEqual(['issuer', 'direct', 'issuer', 'direct']);
    expect(vi.getTimerCount()).toBe(0);
    await host.execute('run.get');
    expect(events.filter((event) => event === 'issuer')).toHaveLength(2);
    host.releaseIssuance();
    await act(async () => Promise.resolve());
    host.dispose();
  });

  it('coalesces successful held acquisitions across real services', async () => {
    const events: string[] = [];
    const host = new SyntheticStandardManagementHost((event) => events.push(event.channel));
    await host.setEnabled(true);
    host.holdIssuance = true;
    const work = Promise.all([host.execute('run.list'), host.execute('connector.group.list')]);
    await vi.waitFor(() => expect(events).toEqual(['issuer']));
    host.releaseIssuance();
    await work;
    expect(events).toEqual(['issuer', 'direct', 'direct']);
    host.dispose();
  });

  it('preserves a valid token on a transient renewal failure through run service entrypoints', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T18:00:00Z'));
    const events: string[] = [];
    const host = new SyntheticStandardManagementHost((event) => events.push(event.channel));
    await host.setEnabled(true);
    await host.execute('run.list');
    host.scenario = 'issuer503';
    vi.setSystemTime(Date.now() + 240_000);
    await host.execute('run.get');
    await host.execute('run.list');
    expect(events).toEqual(['issuer', 'direct', 'issuer', 'direct', 'direct']);
    expect(vi.getTimerCount()).toBe(0);
    host.dispose();
  });

  it('releases held fixture work on teardown without dispatching late business work', async () => {
    const events: string[] = [];
    const host = new SyntheticStandardManagementHost((event) => events.push(event.channel));
    await host.setEnabled(true);
    host.holdIssuance = true;
    const work = host.execute('run.list');
    const rejection = expect(work).rejects.toThrow(/context/i);
    await vi.waitFor(() => expect(events).toEqual(['issuer']));
    host.dispose();
    await rejection;
    expect(events).toEqual(['issuer']);
  });
});
