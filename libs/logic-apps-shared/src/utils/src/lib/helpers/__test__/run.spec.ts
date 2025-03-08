import { describe, it, expect } from 'vitest';
import { getCallbackUrl, getIsCallbackUrlSupported, getRequestTriggerName, getTriggerName } from '../run';
import { CallbackInfo, LogicAppsV2 } from '../../models';

const requestDefinition: LogicAppsV2.WorkflowDefinition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {},
  contentVersion: '1.0.0.0',
  outputs: {},
  triggers: {
    When_a_HTTP_request_is_received: {
      kind: 'Http',
      type: 'Request',
    },
  },
};

const recurrenceDefinition: LogicAppsV2.WorkflowDefinition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {},
  contentVersion: '1.0.0.0',
  outputs: {},
  triggers: {
    Recurrence: {
      recurrence: {
        frequency: 'Minute',
        interval: 10,
      },
      type: 'Recurrence',
    },
  },
};

const emptyDefinition: LogicAppsV2.WorkflowDefinition = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {},
  contentVersion: '1.0.0.0',
  outputs: {},
  triggers: {},
};

describe('lib/utils/src/lib/helpers', () => {
  describe('getCallbackUrl', () => {
    it('should return undefined when passed nothing', () => {
      expect(getCallbackUrl(undefined)).toBeUndefined();
    });

    it('should return a callback URL when value is set', () => {
      const callbackInfo: CallbackInfo = {
        value: 'value',
      };
      expect(getCallbackUrl(callbackInfo)).toBe(callbackInfo.value);
    });

    it('should return a callback URL when relativePath is set', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath is set without prepended /', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        relativePath: 'apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath and basePath are set', () => {
      const callbackInfo: CallbackInfo = {
        basePath: '/root',
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/root/apis/list');
    });

    it('should return a callback URL when relativePath and queries are set', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        queries: {
          'api-version': '2022-02-01',
        },
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list?api-version=2022-02-01');
    });
  });
  describe('getIsCallbackUrlSupported', () => {
    it('should return an object with the trigger name and isCallbackUrlSupported as true when is Request or HTTP trigger', () => {
      const isCallbackUrlSupported = getIsCallbackUrlSupported(requestDefinition);
      expect(isCallbackUrlSupported).toEqual({ triggerName: 'When_a_HTTP_request_is_received', isCallbackUrlSupported: true });
    });

    it('should return an object with the trigger name and isCallbackUrlSupported as false when is not Request or HTTP trigger', () => {
      const isCallbackUrlSupported = getIsCallbackUrlSupported(recurrenceDefinition);

      expect(isCallbackUrlSupported).toEqual({ triggerName: 'Recurrence', isCallbackUrlSupported: false });
    });

    it('should return an object with the trigger name as undefined and isCallbackUrlSupported as false when there is no trigger in the definition', () => {
      const isCallbackUrlSupported = getIsCallbackUrlSupported(emptyDefinition);

      expect(isCallbackUrlSupported).toEqual({ triggerName: undefined, isCallbackUrlSupported: false });
    });
  });

  describe('getRequestTriggerName', () => {
    it('should return the name of the request trigger', () => {
      const requestTriggerName = getRequestTriggerName(requestDefinition);
      expect(requestTriggerName).toBe('When_a_HTTP_request_is_received');
    });

    it('should return undefined if no request trigger is found', () => {
      const requestTriggerName = getRequestTriggerName(recurrenceDefinition);
      expect(requestTriggerName).toBeUndefined();
    });
  });

  describe('getTriggerName', () => {
    it('should return the name of the trigger when there is only one', () => {
      const triggerName = getTriggerName(requestDefinition);
      expect(triggerName).toBe('When_a_HTTP_request_is_received');
    });

    it('should return undefined when there are multiple triggers', () => {
      const definition: any = {
        triggers: {
          When_a_HTTP_request_is_received: {
            kind: 'Http',
            type: 'Request',
          },
          Recurrence: {
            recurrence: {
              frequency: 'Minute',
              interval: 10,
            },
            type: 'Recurrence',
          },
        },
      };
      const triggerName = getTriggerName(definition);
      expect(triggerName).toBeUndefined();
    });

    it('should return undefined when there are no triggers', () => {
      const triggerName = getTriggerName(emptyDefinition);
      expect(triggerName).toBeUndefined();
    });
  });
});
