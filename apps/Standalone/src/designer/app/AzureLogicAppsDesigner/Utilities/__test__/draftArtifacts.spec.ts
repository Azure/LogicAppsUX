import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionsData } from '../../Models/Workflow';
import { mergeConnectionsData, shouldUseProductionArtifacts } from '../draftArtifacts';

describe('draft artifact freshness', () => {
  const productionTime = '2026-10-26T12:00:00Z';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connections when the selected draft source changes', () => {
    const connections = (server: string): ConnectionsData => ({
      serviceProviderConnections: {
        sql: { serviceProvider: { id: 'sql' }, parameterValues: { server } },
      },
    });

    it('replaces the previous server snapshot instead of treating stale draft values as local edits', () => {
      const draft = connections('stale-draft-server');
      const production = connections('production-server');
      const initiallyLoaded = mergeConnectionsData(draft, {}, undefined);
      const selectedProduction = mergeConnectionsData(production, initiallyLoaded, draft);

      expect(selectedProduction.serviceProviderConnections).toEqual(production.serviceProviderConnections);
    });

    it('preserves genuinely added and modified local connections while refreshing other server connections', () => {
      const previous = connections('previous-server');
      const local: ConnectionsData = {
        ...connections('locally-edited-server'),
        functionConnections: {
          added: {
            function: { id: 'local-function' },
            triggerUrl: 'https://example.invalid/function',
            authentication: { type: 'None', name: '', value: '' },
          },
        },
      };
      const refreshed = mergeConnectionsData(connections('new-server'), local, previous);

      expect(refreshed.serviceProviderConnections).toEqual(local.serviceProviderConnections);
      expect(refreshed.functionConnections).toEqual(local.functionConnections);
    });

    it('does not retain connections removed from the server when they were not locally edited', () => {
      const previous = connections('removed-server');
      expect(mergeConnectionsData({}, previous, previous).serviceProviderConnections).toEqual({});
    });

    it('merges knowledge-hub connections on load, refresh and local edits', () => {
      const knowledgeHub = (displayName: string): NonNullable<ConnectionsData['knowledgeHubConnections']>[string] => ({
        displayName,
        completionsOpenAI: {
          completionsModel: 'completions',
          openAI: { endpoint: 'https://example.invalid/openai', authentication: { type: 'ManagedServiceIdentity' } },
        },
        embeddingsOpenAI: {
          embeddingsModel: 'embeddings',
          openAI: { endpoint: 'https://example.invalid/openai', authentication: { type: 'ManagedServiceIdentity' } },
        },
        cosmosDB: { endpoint: 'https://example.invalid/cosmos', authentication: { type: 'ManagedServiceIdentity' } },
      });
      const previous: ConnectionsData = { knowledgeHubConnections: { hub: knowledgeHub('previous') } };
      const production: ConnectionsData = { knowledgeHubConnections: { hub: knowledgeHub('production') } };
      const initiallyLoaded = mergeConnectionsData(previous, {}, undefined);

      expect(initiallyLoaded.knowledgeHubConnections).toEqual(previous.knowledgeHubConnections);
      expect(mergeConnectionsData(production, initiallyLoaded, previous).knowledgeHubConnections).toEqual(
        production.knowledgeHubConnections
      );
      const local: ConnectionsData = { knowledgeHubConnections: { hub: knowledgeHub('local'), added: knowledgeHub('added') } };
      expect(mergeConnectionsData(production, local, previous).knowledgeHubConnections).toEqual(local.knowledgeHubConnections);
    });
  });

  it.each(['2026-10-20T12:00:00Z', productionTime])('uses production when the draft was modified at %s', (draftTime) => {
    expect(shouldUseProductionArtifacts(productionTime, draftTime)).toBe(true);
  });

  it('preserves a newer draft', () => {
    expect(shouldUseProductionArtifacts(productionTime, '2026-10-27T12:00:00Z')).toBe(false);
  });

  it('compares instants rather than timestamp string ordering', () => {
    expect(shouldUseProductionArtifacts(productionTime, '2026-10-26T08:00:00-04:00')).toBe(true);
    expect(shouldUseProductionArtifacts(productionTime, '2026-10-26T08:00:01-04:00')).toBe(false);
  });

  it.each([
    [undefined, productionTime],
    ['', productionTime],
    ['invalid-time', productionTime],
    [productionTime, undefined],
    [productionTime, ''],
    [productionTime, 'invalid-time'],
  ])('preserves the draft with diagnostics when timestamps cannot be compared (%s, %s)', (productionTime, draftTime) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(shouldUseProductionArtifacts(productionTime, draftTime)).toBe(false);
    expect(warning).toHaveBeenCalledOnce();
  });
});
