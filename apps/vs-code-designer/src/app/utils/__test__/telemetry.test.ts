import { describe, test, expect, vi, afterEach } from 'vitest';
import { runWithDurationTelemetry, logSubscriptions } from '../telemetry';
import { ext } from '../../../extensionVariables';

describe('runWithDurationTelemetry', () => {
  test('should return callback result and update telemetry measurements', async () => {
    const context = {
      telemetry: { measurements: {} as Record<string, number>, properties: {} },
    } as any;
    const result = await runWithDurationTelemetry(context, 'test', async () => 'success');
    expect(result).toBe('success');
    expect(context.telemetry.measurements.testCount).toBe(1);
    expect(context.telemetry.measurements.testDuration).toBeGreaterThanOrEqual(0);
  });

  test('should update telemetry measurements even when callback throws error', async () => {
    const context = {
      telemetry: { measurements: {} as Record<string, number>, properties: {} },
    } as any;
    const errorCallback = async () => {
      throw new Error('failure');
    };
    await expect(runWithDurationTelemetry(context, 'fail', errorCallback)).rejects.toThrow('failure');
    expect(context.telemetry.measurements.failCount).toBe(1);
    expect(context.telemetry.measurements.failDuration).toBeGreaterThanOrEqual(0);
  });
});

describe('logSubscriptions', () => {
  const originalSubscriptionProvider = ext.subscriptionProvider;

  afterEach(() => {
    ext.subscriptionProvider = originalSubscriptionProvider;
  });

  test('should set subscriptions to an empty array JSON string when not signed in', async () => {
    ext.subscriptionProvider = {
      isSignedIn: vi.fn().mockResolvedValue(false),
      getSubscriptions: vi.fn(),
    } as any;
    const context = {
      telemetry: { measurements: {} as Record<string, number>, properties: {} },
    } as any;
    await logSubscriptions(context);
    expect(context.telemetry.properties.subscriptions).toBe('[]');
  });

  test('should set subscriptions with proper data when signed in', async () => {
    const mockSubscriptions = [
      { subscriptionId: 'sub1', tenantId: 'tenant1', isCustomCloud: true },
      { subscriptionId: 'sub2', tenantId: 'tenant2', isCustomCloud: false },
    ];
    ext.subscriptionProvider = {
      isSignedIn: vi.fn().mockResolvedValue(true),
      getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
    } as any;
    const context = {
      telemetry: { measurements: {} as Record<string, number>, properties: {} },
    } as any;
    await logSubscriptions(context);
    expect(JSON.parse(context.telemetry.properties.subscriptions)).toEqual([
      { subscriptionId: 'sub1', tenantId: 'tenant1', isCustomCloud: true },
      { subscriptionId: 'sub2', tenantId: 'tenant2', isCustomCloud: false },
    ]);
  });

  // Regression guard: vscode-azext-utils masks telemetry properties with \S+ / \S* regexes,
  // which backtrack quadratically over a payload containing no whitespace. A compact
  // JSON.stringify of a large subscription list is one giant \S+ token and cost ~15s of
  // synchronous extension-host CPU. The invariant that prevents this is not "is it indented"
  // (cosmetic) but "is every unbroken non-whitespace run short" (the actual cause).
  test('should not emit long whitespace-free runs for a large subscription list', async () => {
    const mockSubscriptions = Array.from({ length: 650 }, (_, i) => ({
      subscriptionId: `00000000-aaaa-bbbb-cccc-${String(i).padStart(12, '0')}`,
      tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
      isCustomCloud: false,
    }));
    ext.subscriptionProvider = {
      isSignedIn: vi.fn().mockResolvedValue(true),
      getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
    } as any;
    const context = {
      telemetry: { measurements: {} as Record<string, number>, properties: {} },
    } as any;

    await logSubscriptions(context);
    const serialized: string = context.telemetry.properties.subscriptions;

    // No data may be lost or reshaped by the formatting change.
    expect(JSON.parse(serialized)).toEqual(mockSubscriptions);

    // Every whitespace-delimited token must stay short so masking remains linear.
    const longestRun = serialized.split(/\s/).reduce((max, token) => Math.max(max, token.length), 0);
    expect(longestRun).toBeLessThan(200);
  });
});
