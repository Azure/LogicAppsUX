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

const supportedActionTypes = ['Http', 'HttpWebhook', 'ApiConnectionWebhook', 'OpenApiConnectionWebhook'] as const;
const standardWorkflowKinds = ['stateful', 'stateless', 'agentic', 'agent'] as const;

describe('secure error response setting', () => {
  beforeAll(() => {
    InitWorkflowService({ isSplitOnSupported: () => true } as any);
  });

  it.each(supportedActionTypes)('supports %s actions for Consumption workflows', (type) => {
    const settings = getOperationSettings(false, operationInfo(type));

    expect(settings.secureErrorResponse).toEqual({ isSupported: true, value: false });
  });

  it.each(supportedActionTypes.flatMap((type) => standardWorkflowKinds.map((kind) => [type, kind] as const)))(
    'does not support %s actions for Standard %s workflows',
    (type, workflowKind) => {
      const settings = getOperationSettings(false, operationInfo(type), undefined, undefined, undefined, workflowKind);

      expect(settings.secureErrorResponse).toEqual({ isSupported: false, value: false });
    }
  );

  it.each(supportedActionTypes)('does not support %s triggers', (type) => {
    const settings = getOperationSettings(true, operationInfo(type));

    expect(settings.secureErrorResponse?.isSupported).toBe(false);
  });

  it.each(['ApiConnection', 'OpenApiConnection', 'Foreach'])('does not support %s actions', (type) => {
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

  it('serializes the setting when enabled for a Consumption action', () => {
    const originalDefinition = operationDefinition(['inputs', 'futureSecureValue']);
    const settings = getOperationSettings(false, operationInfo('HttpWebhook'), undefined, undefined, originalDefinition);

    expect(settings.secureErrorResponse).toEqual({ isSupported: true, value: false });
    settings.secureErrorResponse = { isSupported: true, value: true };

    expect(serializeSecureData(settings, originalDefinition)?.properties).toEqual(['futureSecureValue', 'inputs', 'errorResponse']);
  });

  it.each(standardWorkflowKinds)('preserves a hidden error response when saving a Standard %s workflow', (workflowKind) => {
    const originalDefinition = operationDefinition(['ErrorResponse', 'futureSecureValue', 'inputs', 'outputs']);
    const settings = getOperationSettings(false, operationInfo('HttpWebhook'), undefined, undefined, originalDefinition, workflowKind);

    expect(settings.secureErrorResponse).toEqual({ isSupported: false, value: true });
    expect(serializeSecureData(settings, originalDefinition)?.properties).toEqual([
      'ErrorResponse',
      'futureSecureValue',
      'inputs',
      'outputs',
    ]);
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

  it('preserves a copied hidden errorResponse without an original definition', () => {
    const secureData = serializeSecureData({
      secureErrorResponse: { isSupported: false, value: true },
    });

    expect(secureData?.properties).toEqual(['errorResponse']);
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
