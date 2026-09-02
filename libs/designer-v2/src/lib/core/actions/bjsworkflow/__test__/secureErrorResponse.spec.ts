import type { NodeOperation } from '../../../state/operation/operationMetadataSlice';
import { getOperationSettings, type Settings } from '../settings';
import { serializeSettings } from '../serializer';
import { InitWorkflowService, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { beforeAll, describe, expect, it } from 'vitest';

const operationInfo = (type: string): NodeOperation => ({
  connectorId: 'connectionProviders/http',
  operationId: 'httpwebhookaction',
  type,
});

const operationDefinition = (properties: string[]): LogicAppsV2.OperationDefinition =>
  ({
    type: 'HttpWebhook',
    runtimeConfiguration: {
      secureData: { properties },
    },
  }) as LogicAppsV2.OperationDefinition;

const serializeSecureData = (settings: Settings, originalDefinition?: LogicAppsV2.OperationDefinition) =>
  serializeSettings(settings, {}, false, originalDefinition).runtimeConfiguration?.secureData;

describe('secure error response setting', () => {
  beforeAll(() => {
    InitWorkflowService({ isSplitOnSupported: () => true } as any);
  });

  it.each([
    ['HttpWebhook', undefined],
    ['HttpWebhook', 'stateful'],
    ['HttpWebhook', 'stateless'],
    ['ApiConnectionWebhook', undefined],
    ['ApiConnectionWebhook', 'stateful'],
    ['ApiConnectionWebhook', 'stateless'],
    ['OpenApiConnectionWebhook', undefined],
    ['OpenApiConnectionWebhook', 'stateful'],
    ['OpenApiConnectionWebhook', 'stateless'],
  ] as const)('supports %s actions for workflow kind %s', (type, workflowKind) => {
    const settings = getOperationSettings(false, operationInfo(type), undefined, undefined, undefined, workflowKind);

    expect(settings.secureErrorResponse).toEqual({ isSupported: true, value: false });
  });

  it.each(['HttpWebhook', 'ApiConnectionWebhook', 'OpenApiConnectionWebhook'])('does not support %s triggers', (type) => {
    const settings = getOperationSettings(true, operationInfo(type));

    expect(settings.secureErrorResponse?.isSupported).toBe(false);
  });

  it.each(['Http', 'ApiConnection', 'OpenApiConnection', 'Foreach'])('does not support %s actions', (type) => {
    const settings = getOperationSettings(false, operationInfo(type));

    expect(settings.secureErrorResponse?.isSupported).toBe(false);
  });

  it('loads the setting case-insensitively', () => {
    const settings = getOperationSettings(
      false,
      operationInfo('HttpWebhook'),
      undefined,
      undefined,
      operationDefinition(['ErrorResponse'])
    );

    expect(settings.secureErrorResponse?.value).toBe(true);
  });

  it('serializes all secure settings independently and preserves unknown values', () => {
    const secureData = serializeSecureData(
      {
        secureInputs: { isSupported: true, value: true },
        secureOutputs: { isSupported: true, value: false },
        secureErrorResponse: { isSupported: true, value: true },
      },
      operationDefinition(['outputs', 'futureSecureValue', 'ERRORRESPONSE'])
    );

    expect(secureData?.properties).toEqual(['futureSecureValue', 'inputs', 'errorResponse']);
  });

  it('removes only errorResponse when the setting is disabled', () => {
    const secureData = serializeSecureData(
      {
        secureInputs: { isSupported: true, value: true },
        secureOutputs: { isSupported: true, value: true },
        secureErrorResponse: { isSupported: true, value: false },
      },
      operationDefinition(['errorResponse', 'futureSecureValue'])
    );

    expect(secureData?.properties).toEqual(['futureSecureValue', 'inputs', 'outputs']);
  });

  it('preserves hidden errorResponse values on unsupported operations', () => {
    const secureData = serializeSecureData(
      {
        secureErrorResponse: { isSupported: false, value: true },
      },
      operationDefinition(['errorResponse', 'futureSecureValue'])
    );

    expect(secureData?.properties).toEqual(['errorResponse', 'futureSecureValue']);
  });

  it('removes the empty secureData container when all settings are disabled', () => {
    const serialized = serializeSettings(
      {
        secureInputs: { isSupported: true, value: false },
        secureOutputs: { isSupported: true, value: false },
        secureErrorResponse: { isSupported: true, value: false },
      },
      {},
      false,
      operationDefinition(['errorResponse'])
    );

    expect(serialized.runtimeConfiguration).toBeUndefined();
  });
});
