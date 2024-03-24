import * as DesignerClientServices from '@microsoft/logic-apps-shared';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector } from '../index';

const getMinimalHostService = (): DesignerClientServices.IHostService => ({
  fetchAndDisplayContent: jest.fn(),
});

describe('lib/connectors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isBuiltInConnector', () => {
    describe('works with no host service callbacks using', () => {
      test('string input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(getMinimalHostService);

        expect(isBuiltInConnector('/builtin/Terminate')).toBe(true);
        expect(isBuiltInConnector('/subscriptions/special/builtin/format')).toBe(false);
      });

      test('Connector input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(getMinimalHostService);

        expect(isBuiltInConnector({ id: '/builtin/Terminate' } as Connector)).toBe(true);
        expect(isBuiltInConnector({ id: '/subscriptions/special/builtin/format' } as Connector)).toBe(false);
      });

      test('OperationApi input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(getMinimalHostService);

        expect(isBuiltInConnector({ id: '/builtin/Terminate' } as OperationApi)).toBe(true);
        expect(isBuiltInConnector({ id: '/subscriptions/special/builtin/format' } as OperationApi)).toBe(false);
      });
    });

    describe('works with host service callback using', () => {
      test('string input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(() => ({
          ...getMinimalHostService(),
          isBuiltInConnector: jest.fn().mockImplementation((value: string) => value === '/subscriptions/special/builtin/format'),
        }));

        expect(isBuiltInConnector('/builtin/Terminate')).toBe(false);
        expect(isBuiltInConnector('/subscriptions/special/builtin/format')).toBe(true);
      });

      test('Connector input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(() => ({
          ...getMinimalHostService(),
          isBuiltInConnector: jest.fn().mockImplementation((value: Connector) => value.id === '/subscriptions/special/builtin/format'),
        }));

        expect(isBuiltInConnector({ id: '/builtin/Terminate' } as Connector)).toBe(false);
        expect(isBuiltInConnector({ id: '/subscriptions/special/builtin/format' } as Connector)).toBe(true);
      });

      test('OperationApi input', () => {
        jest.spyOn(DesignerClientServices, 'HostService').mockImplementation(() => ({
          ...getMinimalHostService(),
          isBuiltInConnector: jest.fn().mockImplementation((value: OperationApi) => value.id === '/subscriptions/special/builtin/format'),
        }));

        expect(isBuiltInConnector({ id: '/builtin/Terminate' } as OperationApi)).toBe(false);
        expect(isBuiltInConnector({ id: '/subscriptions/special/builtin/format' } as OperationApi)).toBe(true);
      });
    });
  });
});
