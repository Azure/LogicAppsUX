import { renderHook } from '@testing-library/react';
import { useOperationDescription, useOperationDocumentation, useOperationSummary } from '../actionMetadataSelector';
import * as designerClientServices from '@microsoft/logic-apps-shared';
import type { Connector, Documentation, IOperationManifestService, OperationManifest } from '@microsoft/logic-apps-shared';
import * as reactQuery from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { describe, vi, afterEach, it, expect } from 'vitest';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

interface QueryMockState {
  connector?: Connector;
  manifest?: OperationManifest;
  swagger?: any;
}

const createQueryResult = (data: unknown, isLoading = false): UseQueryResult<OperationManifest | Connector | undefined, unknown> =>
  ({
    data,
    isLoading,
    status: 'success',
  }) as UseQueryResult<OperationManifest | Connector | undefined, unknown>;

const setupHookMocks = ({
  connector,
  manifest,
  swagger,
  useManifest,
}: QueryMockState & {
  useManifest: boolean;
}) => {
  const mockManifestService: Partial<IOperationManifestService> = {
    getOperationManifest: vi.fn(),
    isSupported: vi.fn(() => useManifest),
  };

  vi.spyOn(designerClientServices, 'OperationManifestService').mockReturnValue(mockManifestService as IOperationManifestService);
  vi.spyOn(designerClientServices, 'TryGetOperationManifestService').mockReturnValue(mockManifestService as IOperationManifestService);
  vi.mocked(reactQuery.useQuery).mockImplementation((queryKey: unknown) => {
    if (!Array.isArray(queryKey)) {
      return createQueryResult(undefined);
    }

    const [queryType, connectorMetadata, operationMetadata] = queryKey;
    if (queryType === 'manifest') {
      if (!useManifest) {
        return createQueryResult(undefined);
      }

      const normalizedConnectorId = (connectorMetadata as { connectorId?: string })?.connectorId;
      const normalizedOperationId = (operationMetadata as { operationId?: string })?.operationId;
      if (!normalizedConnectorId || !normalizedOperationId) {
        return createQueryResult(undefined);
      }
      return createQueryResult(manifest);
    }

    if (queryType === 'connector') {
      return createQueryResult(connector);
    }

    if (queryType === 'swagger') {
      return createQueryResult(swagger);
    }

    return createQueryResult(undefined);
  });
};

const createSwagger = (operationId: string, operation: Record<string, unknown>) => ({
  swagger: '2.0',
  info: {
    title: 'Mock Connector',
    version: '1.0',
  },
  paths: {
    '/mock/path': {
      post: {
        operationId,
        ...operation,
      },
    },
  },
});

describe('actionMetadataSelector', () => {
  afterEach(() => {
    vi.mocked(reactQuery.useQuery).mockReset();
    vi.restoreAllMocks();
  });

  describe('useOperationDescription', () => {
    it.each<[string?]>([[undefined], [''], ['Description for an operation, which may be multiple sentences\nor lines.']])(
      'should retrieve description from manifest (%#)',
      (input) => {
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

        setupHookMocks({
          connector,
          manifest: operationManifest,
          useManifest: true,
        });

        const { result } = renderHook(() =>
          useOperationDescription({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
        );
        expect(result.current).toMatchObject({
          isLoading: false,
          result: input,
        });
      }
    );

    it.each<[string?]>([[undefined], [''], ['Description for an operation, which may be multiple sentences\nor lines.']])(
      'should retrieve description from connector (%#)',
      (input) => {
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

        setupHookMocks({
          connector,
          manifest: operationManifest,
          useManifest: false,
        });

        const { result } = renderHook(() =>
          useOperationDescription({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
        );
        expect(result.current).toMatchObject({
          isLoading: false,
          result: input,
        });
      }
    );

    it('should prefer description from swagger when available', () => {
      const connector: Connector = {
        id: 'connectorId',
        name: 'My Connector',
        properties: {
          description: 'Connector description',
          displayName: 'My Operation',
          iconUri: 'https://example.com/icon.png',
        },
        type: 'connector',
      };

      setupHookMocks({
        connector,
        useManifest: false,
        swagger: createSwagger('operationId', {
          description: 'Swagger description',
        }),
      });

      const { result } = renderHook(() =>
        useOperationDescription({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
      );
      expect(result.current.result).toBe('Swagger description');
    });
  });

  describe('useOperationDocumentation', () => {
    it.each<[Documentation?]>([
      [undefined],
      [{ url: 'https://example.com/doc' }],
      [{ url: 'not really a URL but should be permitted anyway' }],
    ])('should retrieve documentation from manifest (%#)', (input) => {
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

      setupHookMocks({
        connector,
        manifest: operationManifest,
        useManifest: true,
      });

      const { result } = renderHook(() =>
        useOperationDocumentation({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
      );
      expect(result.current).toMatchObject({
        isLoading: false,
        result: input,
      });
    });

    it.each<[Documentation?]>([
      [undefined],
      [{ url: 'https://example.com/doc' }],
      [{ url: 'not really a URL but should be permitted anyway' }],
    ])('should retrieve documentation from connector (%#)', (input) => {
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

      setupHookMocks({
        connector,
        manifest: operationManifest,
        useManifest: false,
      });

      const { result } = renderHook(() =>
        useOperationDocumentation({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
      );
      expect(result.current).toMatchObject({
        isLoading: false,
        result: input,
      });
    });
  });

  describe('useOperationSummary', () => {
    it.each<[string]>([[''], ['Operation'], ['Operation Summary']])('should retrieve name/summary from manifest (%#)', (input) => {
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

      setupHookMocks({
        connector,
        manifest: operationManifest,
        useManifest: true,
      });

      const { result } = renderHook(() =>
        useOperationSummary({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
      );
      expect(result.current).toMatchObject({
        isLoading: false,
        result: input,
      });
    });

    it('should return undefined summary when operation id is missing', () => {
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

      setupHookMocks({
        connector,
        manifest: operationManifest,
        useManifest: true,
      });

      const { result } = renderHook(() => useOperationSummary({ connectorId: 'connectorId', operationId: '', type: 'operation' }));
      expect(result.current).toMatchObject({
        isLoading: false,
        result: undefined,
      });
    });

    it('should retrieve name/summary operation ID (%#)', () => {
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

      setupHookMocks({
        connector,
        manifest: operationManifest,
        useManifest: true,
      });

      const { result } = renderHook(() =>
        useOperationSummary({ connectorId: 'connectorId', operationId: 'operationId', type: 'operation' })
      );
      expect(result.current).toMatchObject({
        isLoading: false,
        result: 'Operation Id',
      });
    });
  });
});
