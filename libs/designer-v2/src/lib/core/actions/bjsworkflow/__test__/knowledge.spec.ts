import { afterEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  cognitive: vi.fn(),
  connection: vi.fn(),
  editor: vi.fn(),
  gateway: vi.fn(),
  resource: vi.fn(),
  logger: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  InitCognitiveServiceService: serviceMocks.cognitive,
  InitConnectionService: serviceMocks.connection,
  InitConnectionParameterEditorService: serviceMocks.editor,
  InitGatewayService: serviceMocks.gateway,
  InitResourceService: serviceMocks.resource,
  InitLoggerService: serviceMocks.logger,
  DevLogger: class DevLogger {},
}));

import { initializeData, initializeServices, type KnowledgeServiceOptions } from '../knowledge';

const services = {
  cognitiveService: { name: 'cognitive' },
  connectionService: { name: 'connection' },
  connectionParameterEditorService: { name: 'editor' },
  gatewayService: { name: 'gateway' },
  resourceService: { name: 'resource' },
} as unknown as KnowledgeServiceOptions;

describe('knowledge service initialization', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('registers every required service and the development logger', () => {
    vi.stubEnv('NODE_ENV', 'development');

    initializeServices(services);

    expect(serviceMocks.cognitive).toHaveBeenCalledWith(services.cognitiveService);
    expect(serviceMocks.connection).toHaveBeenCalledWith(services.connectionService);
    expect(serviceMocks.editor).toHaveBeenCalledWith(services.connectionParameterEditorService);
    expect(serviceMocks.gateway).toHaveBeenCalledWith(services.gatewayService);
    expect(serviceMocks.resource).toHaveBeenCalledWith(services.resourceService);
    expect(serviceMocks.logger.mock.calls[0][0]).toHaveLength(1);
  });

  it('includes a supplied logger and omits the development logger in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const loggerService = { log: vi.fn() };

    initializeServices({ ...services, loggerService } as KnowledgeServiceOptions);

    expect(serviceMocks.logger).toHaveBeenCalledWith([loggerService]);
  });

  it('fulfills initializeData after registering services', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const dispatch = vi.fn();

    const result = await initializeData(services)(dispatch, vi.fn(), undefined);

    expect(result.type).toBe('initializeKnowledgeData/fulfilled');
    expect(result.payload).toBe(true);
    expect(serviceMocks.resource).toHaveBeenCalledWith(services.resourceService);
  });
});
