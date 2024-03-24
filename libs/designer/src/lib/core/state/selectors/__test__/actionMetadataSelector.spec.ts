import * as connectionSelector from '../../connection/connectionSelector';
import { useOperationDescription, useOperationDocumentation, useOperationSummary } from '../actionMetadataSelector';
import * as designerClientServices from '@microsoft/logic-apps-shared';
import type { Connector, Documentation, OperationManifest } from '@microsoft/logic-apps-shared';
import * as reactQuery from 'react-query';

describe('actionMetadataSelector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useOperationDescription', () => {
    it.each<[string?]>([[undefined], [''], ['Description for an operation, which may be multiple sentences\nor lines.']])(
      'should retrieve description from manifest (%#)',
      async (input) => {
        const connector: Connector = {
          id: 'connectorId',
          name: 'My Connector',
          properties: {
            displayName: 'My Operation',
            iconUri: 'https://example.com/icon.png',
          },
          type: 'connector',
        };

        const operationManifest: OperationManifest = {
          properties: {
            brandColor: '#fff',
            connector,
            description: input,
            iconUri: 'https://example.com/icon.png',
          },
        };

        const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
          getOperationManifest: () => Promise.resolve(operationManifest),
          isSupported: () => true,
        };

        jest
          .spyOn(designerClientServices, 'OperationManifestService')
          .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

        jest
          .spyOn(reactQuery, 'useQuery')
          .mockReturnValue({ data: operationManifest, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<
            OperationManifest | undefined,
            unknown
          >);

        const result = useOperationDescription({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' });
        expect(result).toMatchObject({
          isLoading: false,
          result: input,
        });
      }
    );

    it.each<[string?]>([[undefined], [''], ['Description for an operation, which may be multiple sentences\nor lines.']])(
      'should retrieve description from connector (%#)',
      async (input) => {
        const connector: Connector = {
          id: 'connectorId',
          name: 'My Connector',
          properties: {
            description: input,
            displayName: 'My Operation',
            iconUri: 'https://example.com/icon.png',
          },
          type: 'connector',
        };

        const operationManifest: OperationManifest = {
          properties: {
            brandColor: '#fff',
            iconUri: 'https://example.com/icon.png',
          },
        };

        const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
          getOperationManifest: () => Promise.resolve(operationManifest),
          isSupported: () => false, // Force call to `useConnector`.
        };

        jest
          .spyOn(designerClientServices, 'OperationManifestService')
          .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

        jest.spyOn(reactQuery, 'useQuery').mockReturnValue({
          data: undefined /* Force call to `useConnector`. */,
          isLoading: false,
          status: 'success',
        } as reactQuery.UseQueryResult<OperationManifest | undefined, unknown>);

        jest
          .spyOn(connectionSelector, 'useConnector')
          .mockReturnValue({ data: connector, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<any, unknown>);

        const result = useOperationDescription({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' });
        expect(result).toMatchObject({
          isLoading: false,
          result: input,
        });
      }
    );
  });

  describe('useOperationDocumentation', () => {
    it.each<[Documentation?]>([
      [undefined],
      [{ url: 'https://example.com/doc' }],
      [{ url: 'not really a URL but should be permitted anyway' }],
    ])('should retrieve documentation from manifest (%#)', async (input) => {
      const connector: Connector = {
        id: 'connectorId',
        name: 'My Connector',
        properties: {
          displayName: 'My Operation',
          externalDocs: input,
          iconUri: 'https://example.com/icon.png',
        },
        type: 'connector',
      };

      const operationManifest: OperationManifest = {
        properties: {
          brandColor: '#fff',
          connector,
          iconUri: 'https://example.com/icon.png',
        },
      };

      const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
        getOperationManifest: () => Promise.resolve(operationManifest),
        isSupported: () => true,
      };

      jest
        .spyOn(designerClientServices, 'OperationManifestService')
        .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

      jest
        .spyOn(reactQuery, 'useQuery')
        .mockReturnValue({ data: operationManifest, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<
          OperationManifest | undefined,
          unknown
        >);

      const result = useOperationDocumentation({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' });
      expect(result).toMatchObject({
        isLoading: false,
        result: input,
      });
    });

    it.each<[Documentation?]>([
      [undefined],
      [{ url: 'https://example.com/doc' }],
      [{ url: 'not really a URL but should be permitted anyway' }],
    ])('should retrieve documentation from connector (%#)', async (input) => {
      const connector: Connector = {
        id: 'connectorId',
        name: 'My Connector',
        properties: {
          displayName: 'My Operation',
          externalDocs: input,
          iconUri: 'https://example.com/icon.png',
        },
        type: 'connector',
      };

      const operationManifest: OperationManifest = {
        properties: {
          brandColor: '#fff',
          iconUri: 'https://example.com/icon.png',
        },
      };

      const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
        getOperationManifest: () => Promise.resolve(operationManifest),
        isSupported: () => false, // Force call to `useConnector`.
      };

      jest
        .spyOn(designerClientServices, 'OperationManifestService')
        .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

      jest.spyOn(reactQuery, 'useQuery').mockReturnValue({
        data: undefined /* Force call to `useConnector`. */,
        isLoading: false,
        status: 'success',
      } as reactQuery.UseQueryResult<OperationManifest | undefined, unknown>);

      jest
        .spyOn(connectionSelector, 'useConnector')
        .mockReturnValue({ data: connector, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<any, unknown>);

      const result = useOperationDocumentation({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' });
      expect(result).toMatchObject({
        isLoading: false,
        result: input,
      });
    });
  });

  describe('useOperationSummary', () => {
    it.each<[string?]>([[undefined], [''], ['Operation'], ['Operation Summary']])(
      'should retrieve name/summary from manifest (%#)',
      async (input) => {
        const connector: Connector = {
          id: 'connectorId',
          name: 'My Connector',
          properties: {
            displayName: 'My Operation',
            iconUri: 'https://example.com/icon.png',
          },
          type: 'connector',
        };

        const operationManifest: OperationManifest = {
          properties: {
            brandColor: '#fff',
            connector,
            iconUri: 'https://example.com/icon.png',
            summary: input,
          },
        };

        const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
          getOperationManifest: () => Promise.resolve(operationManifest),
          isSupported: () => true,
        };

        jest
          .spyOn(designerClientServices, 'OperationManifestService')
          .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

        jest
          .spyOn(reactQuery, 'useQuery')
          .mockReturnValue({ data: operationManifest, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<
            OperationManifest | undefined,
            unknown
          >);

        const result = useOperationSummary({ connectorId: 'connectorId', operationId: '', type: 'operation' });
        expect(result).toMatchObject({
          isLoading: false,
          result: input,
        });
      }
    );

    it('should retrieve name/summary operation ID (%#)', async () => {
      const connector: Connector = {
        id: 'connectorId',
        name: 'My Connector',
        properties: {
          displayName: 'My Operation',
          iconUri: 'https://example.com/icon.png',
        },
        type: 'connector',
      };

      const operationManifest: OperationManifest = {
        properties: {
          brandColor: '#fff',
          connector,
          iconUri: 'https://example.com/icon.png',
        },
      };

      const partialOperationManifestService: Partial<designerClientServices.IOperationManifestService> = {
        getOperationManifest: () => Promise.resolve(operationManifest),
        isSupported: () => true,
      };

      jest
        .spyOn(designerClientServices, 'OperationManifestService')
        .mockReturnValue(partialOperationManifestService as designerClientServices.IOperationManifestService);

      jest
        .spyOn(reactQuery, 'useQuery')
        .mockReturnValue({ data: operationManifest, isLoading: false, status: 'success' } as reactQuery.UseQueryResult<
          OperationManifest | undefined,
          unknown
        >);

      const result = useOperationSummary({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' });
      expect(result).toMatchObject({
        isLoading: false,
        result: 'Operation Id',
      });
    });
  });
});
