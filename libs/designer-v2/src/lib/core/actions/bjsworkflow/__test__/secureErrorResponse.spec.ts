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

  it('serializes enabled secure settings for a Consumption action', () => {
    const settings = getOperationSettings(false, operationInfo('HttpWebhook'));
    settings.secureInputs = { isSupported: true, value: true };
    settings.secureErrorResponse = { isSupported: true, value: true };

    expect(serializeSecureData(settings)?.properties).toEqual(['inputs', 'errorResponse']);
  });

  it.each(standardWorkflowKinds)('does not serialize errorResponse for Standard %s workflows', (workflowKind) => {
    const originalDefinition = operationDefinition(['ErrorResponse']);
    const settings = getOperationSettings(false, operationInfo('HttpWebhook'), undefined, undefined, originalDefinition, workflowKind);

    expect(settings.secureErrorResponse).toEqual({ isSupported: false, value: true });
    expect(serializeSecureData(settings, originalDefinition)).toBeUndefined();
  });

  it('does not serialize errorResponse when the setting is disabled', () => {
    const secureData = serializeSecureData({
      secureInputs: { isSupported: true, value: true },
      secureOutputs: { isSupported: true, value: true },
      secureErrorResponse: { isSupported: true, value: false },
    });

    expect(secureData?.properties).toEqual(['inputs', 'outputs']);
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
