import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAllReferenceKeys, useAreMappingsInitialized, useConnectionReference, useOperationNodeIds } from '../selector';
import { connectorId, createMcpHarness, createMcpState, expressionMapping, reference } from './fixtures';

afterEach(cleanup);

describe('MCP connection selectors', () => {
  it('groups only concrete references, ignoring a leading runtime expression and unassigned nodes', () => {
    const state = createMcpState();
    state.connection.connectionsMapping = { runtime: expressionMapping, unassigned: null, first: 'Sql', second: 'Sql', other: 'Blob' };
    state.connection.connectionReferences.Blob = { api: { id: '/serviceProviders/blob' }, connection: { id: '/connections/Blob' } };
    const { result } = renderHook(
      () => ({
        reference: useConnectionReference(),
        sqlNodes: useOperationNodeIds(connectorId.toUpperCase()),
        blobNodes: useOperationNodeIds('/serviceProviders/blob'),
        keys: useAllReferenceKeys(),
      }),
      createMcpHarness(state)
    );
    expect(result.current).toEqual({
      reference,
      sqlNodes: ['first', 'second'],
      blobNodes: ['other'],
      keys: ['Sql', 'Blob'],
    });
  });

  it.each(['expression', 'null', 'missing', 'dangling reference'] as const)(
    'does not treat %s mappings as usable concrete connections',
    (kind) => {
      const state = createMcpState();
      state.connection.connectionsMapping =
        kind === 'missing' ? {} : { Query: kind === 'expression' ? expressionMapping : kind === 'null' ? null : 'Unknown' };
      const { result } = renderHook(
        () => ({ reference: useConnectionReference(), nodes: useOperationNodeIds(connectorId) }),
        createMcpHarness(state)
      );
      expect(result.current).toEqual({ reference: undefined, nodes: [] });
    }
  );

  it('skips dangling references when looking up a connector and returns no nodes for an unknown connector', () => {
    const state = createMcpState();
    state.connection.connectionsMapping = { orphan: 'Unknown', Query: 'Sql' };
    const { result } = renderHook(
      () => ({ sql: useOperationNodeIds(connectorId), unknown: useOperationNodeIds('/serviceProviders/unknown') }),
      createMcpHarness(state)
    );
    expect(result.current).toEqual({ sql: ['Query'], unknown: [] });
  });

  it('distinguishes initialized mappings from usable references, including null and expression mappings', () => {
    const state = createMcpState();
    state.connection.connectionsMapping = { concrete: 'Sql', runtime: expressionMapping, unassigned: null };
    const { result } = renderHook(
      () => ({
        initialized: useAreMappingsInitialized(['concrete', 'runtime', 'unassigned']),
        missing: useAreMappingsInitialized(['concrete', 'absent']),
        empty: useAreMappingsInitialized([]),
      }),
      createMcpHarness(state)
    );
    expect(result.current).toEqual({ initialized: true, missing: false, empty: true });
  });

  it('returns no keys or nodes before any connections are initialized', () => {
    const state = createMcpState();
    state.connection.connectionReferences = {};
    state.connection.connectionsMapping = {};
    const { result } = renderHook(
      () => ({ keys: useAllReferenceKeys(), nodes: useOperationNodeIds(connectorId) }),
      createMcpHarness(state)
    );
    expect(result.current).toEqual({ keys: [], nodes: [] });
  });
});
