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
      { id: 'sub1', tenant: 'tenant1', isCustomCloud: true },
      { id: 'sub2', tenant: 'tenant2', isCustomCloud: false },
    ]);
  });
});
