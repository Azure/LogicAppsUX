import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as portfinder from 'portfinder';
import { releaseReservedPort, reserveFreePort, resetReservedPorts } from '../portReservation';

vi.mock('portfinder', () => ({
  getPortPromise: vi.fn(),
}));

/**
 * Models real `portfinder` behavior: return the first free port at or above the
 * requested base (defaulting to 8000), skipping ports the caller says are taken.
 * Unlike a constant mock this lets the allocator's retry-past-reserved logic
 * make forward progress.
 */
function mockPortfinderFrom(base: number, taken: Set<number> = new Set()): void {
  vi.mocked(portfinder.getPortPromise).mockImplementation((async (opts?: { port?: number }) => {
    let candidate = opts?.port ?? base;
    while (taken.has(candidate)) {
      candidate++;
    }
    return candidate;
  }) as never);
}

describe('portReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReservedPorts();
  });

  it('hands out distinct ports to concurrent callers even when portfinder returns the same value', async () => {
    // A "stuck" portfinder that always reports the same base free port unless a
    // higher base is requested — exactly the concurrent-startup race condition.
    mockPortfinderFrom(8000);

    const [a, b, c] = await Promise.all([reserveFreePort(), reserveFreePort(), reserveFreePort()]);

    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).toBe(8000);
    expect(b).toBe(8001);
    expect(c).toBe(8002);
  });

  it('reuses a port after it has been released', async () => {
    mockPortfinderFrom(8000);

    const first = await reserveFreePort();
    expect(first).toBe(8000);

    releaseReservedPort(first);

    // With 8000 free again, the next reservation should be able to take it back.
    const second = await reserveFreePort();
    expect(second).toBe(8000);
  });

  it('keeps a released port distinct from ports still held', async () => {
    mockPortfinderFrom(8000);

    const held = await reserveFreePort(); // 8000 (kept)
    const temp = await reserveFreePort(); // 8001
    releaseReservedPort(temp); // free 8001 only

    const next = await reserveFreePort();
    expect(next).toBe(8001);
    expect(next).not.toBe(held);
  });

  it('treats releaseReservedPort(undefined) as a no-op', async () => {
    mockPortfinderFrom(8000);

    const a = await reserveFreePort();
    releaseReservedPort(undefined);
    const b = await reserveFreePort();

    expect(a).toBe(8000);
    expect(b).toBe(8001);
  });

  it('serializes allocations so each caller observes prior reservations', async () => {
    // Constant portfinder that always reports the same base free port unless a
    // higher base is requested. Only the serialized reserved set can make three
    // concurrent callers land on distinct ports.
    mockPortfinderFrom(8000);

    const results = await Promise.all([reserveFreePort(), reserveFreePort(), reserveFreePort()]);

    expect(new Set(results).size).toBe(3);
    expect([...results].sort((x, y) => x - y)).toEqual([8000, 8001, 8002]);
  });

  it('does not spin forever when portfinder can never find a free port', async () => {
    // Constant portfinder that always returns a reserved port. The allocator
    // must fall back to a best-effort port instead of hanging.
    vi.mocked(portfinder.getPortPromise).mockResolvedValue(8000 as never);

    const first = await reserveFreePort();
    expect(first).toBe(8000);

    // Second call can never escape 8000; it should still resolve (best effort).
    await expect(reserveFreePort()).resolves.toBe(8000);
  });
});
