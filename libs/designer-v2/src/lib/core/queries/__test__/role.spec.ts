import type { ArmResource, RoleAssignment, RoleDefinition } from '@microsoft/logic-apps-shared';
import { RoleService } from '@microsoft/logic-apps-shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMissingRoleDefinitions,
  roleQueryKeys,
  useAppIdentityRoleAssignmentsForResourceQuery,
  useHasRoleAssignmentsWritePermissionQuery,
  useHasRequiredRoleDefinitionsQuery,
  useResourceRoleDefinitionsQuery,
  useRoleDefinitionsByIdQuery,
  useUserRoleAssignmentsForResourceQuery,
} from '../role';

const mockFetchQuery = vi.fn();

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    RoleService: vi.fn(),
  };
});

vi.mock('../../ReactQueryProvider', () => ({
  getReactQueryClient: vi.fn(() => ({
    fetchQuery: mockFetchQuery,
  })),
}));

const resourceId = '/subscriptions/sub-1/resourceGroups/rg-1/providers/Microsoft.Web/sites/site-1';

const createRoleDefinition = (definitionId: string, roleName: string): ArmResource<RoleDefinition> =>
  ({
    // ARM returns the role definition GUID as the resource `name`.
    id: `/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/${definitionId}`,
    name: definitionId,
    properties: {
      roleName,
    },
  }) as ArmResource<RoleDefinition>;

const createRoleAssignment = (roleDefinitionId: string, scope = resourceId): ArmResource<RoleAssignment> =>
  ({
    properties: {
      roleDefinitionId,
      scope,
    },
  }) as ArmResource<RoleAssignment>;

const foundryUserId = '53ca6127-db72-4b80-b1b0-d745d6d5456d';
const storageBlobDataContributorId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe';
const unknownRoleId = '00000000-0000-0000-0000-000000000000';

const foundryUser = createRoleDefinition(foundryUserId, 'Foundry User');
const storageBlobDataContributor = createRoleDefinition(storageBlobDataContributorId, 'Storage Blob Data Contributor');
const definitionIds = [foundryUserId, storageBlobDataContributorId];
const definitions: Record<string, ArmResource<RoleDefinition>> = {
  [foundryUserId]: foundryUser,
  [storageBlobDataContributorId]: storageBlobDataContributor,
};

let queryClient: QueryClient;
let mockRoleService: {
  fetchRoleDefinitions: ReturnType<typeof vi.fn>;
  fetchUserRoleAssignmentsForResource: ReturnType<typeof vi.fn>;
  fetchAppRoleAssignmentsForResource: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  mockRoleService = {
    fetchRoleDefinitions: vi.fn(),
    fetchUserRoleAssignmentsForResource: vi.fn(),
    fetchAppRoleAssignmentsForResource: vi.fn(),
  };
  vi.mocked(RoleService).mockReturnValue(mockRoleService as any);
});

afterEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('getMissingRoleDefinitions', () => {
  it('returns empty array when resourceId is empty', async () => {
    const result = await getMissingRoleDefinitions('', [foundryUserId]);

    expect(result).toEqual([]);
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it('returns empty array when definitionIds is empty', async () => {
    const result = await getMissingRoleDefinitions(resourceId, []);

    expect(result).toEqual([]);
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it('returns all definitions when no existing assignments', async () => {
    mockFetchQuery.mockResolvedValueOnce([]).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionIds);

    expect(result).toEqual([foundryUser, storageBlobDataContributor]);
    expect(mockFetchQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ queryKey: [roleQueryKeys.appIdentityRoleAssignments, resourceId] })
    );
    expect(mockFetchQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ queryKey: [roleQueryKeys.roleDefinitions, 'byId', definitionIds] })
    );
  });

  it('returns empty array when all roles are already assigned', async () => {
    const assignments = [createRoleAssignment(foundryUser.id), createRoleAssignment(storageBlobDataContributor.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionIds);

    expect(result).toEqual([]);
  });

  it('returns only missing roles when only some roles are assigned', async () => {
    const assignments = [createRoleAssignment(foundryUser.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionIds);

    expect(result).toEqual([storageBlobDataContributor]);
  });

  it('returns empty array when no definitions found', async () => {
    mockFetchQuery.mockResolvedValueOnce([createRoleAssignment(foundryUser.id)]).mockResolvedValueOnce({});

    const result = await getMissingRoleDefinitions(resourceId, [foundryUserId]);

    expect(result).toEqual([]);
  });

  it('skips requested ids with no matching definition when assignments exist', async () => {
    const assignments = [createRoleAssignment(foundryUser.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, [unknownRoleId, ...definitionIds]);

    expect(result).toEqual([storageBlobDataContributor]);
  });

  it('does not throw when an assignment has no roleDefinitionId', async () => {
    const assignments = [{ properties: { scope: resourceId } } as ArmResource<RoleAssignment>];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionIds);

    expect(result).toEqual([foundryUser, storageBlobDataContributor]);
  });
});

describe('useResourceRoleDefinitionsQuery', () => {
  it('fetches role definitions for the resource', async () => {
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([foundryUser]);

    const { result } = renderHook(() => useResourceRoleDefinitionsQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([foundryUser]);
    expect(mockRoleService.fetchRoleDefinitions).toHaveBeenCalledWith(resourceId);
  });
});

describe('useUserRoleAssignmentsForResourceQuery', () => {
  it('fetches user role assignments for the resource', async () => {
    const assignments = [createRoleAssignment(foundryUser.id)];
    mockRoleService.fetchUserRoleAssignmentsForResource.mockResolvedValue(assignments);

    const { result } = renderHook(() => useUserRoleAssignmentsForResourceQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assignments);
    expect(mockRoleService.fetchUserRoleAssignmentsForResource).toHaveBeenCalledWith(resourceId);
  });
});

describe('useAppIdentityRoleAssignmentsForResourceQuery', () => {
  it('fetches app identity role assignments for the resource', async () => {
    const assignments = [createRoleAssignment(storageBlobDataContributor.id)];
    mockRoleService.fetchAppRoleAssignmentsForResource.mockResolvedValue(assignments);

    const { result } = renderHook(() => useAppIdentityRoleAssignmentsForResourceQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(assignments);
    expect(mockRoleService.fetchAppRoleAssignmentsForResource).toHaveBeenCalledWith(resourceId);
  });
});

describe('useHasRoleAssignmentsWritePermissionQuery', () => {
  it('returns true when the user holds a role with assignment write permission', async () => {
    const writeRole = createRoleDefinition('write-role-id', 'Owner');
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([writeRole]);
    mockFetchQuery.mockResolvedValue([{ properties: { roleDefinitionId: writeRole.id, scope: resourceId } }]);

    const { result } = renderHook(() => useHasRoleAssignmentsWritePermissionQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
    expect(mockRoleService.fetchRoleDefinitions).toHaveBeenCalledWith(resourceId, {
      $filter: "hasAllPermissions('Microsoft.Authorization/roleAssignments/write')",
    });
  });

  it('returns false when the user has no matching role assignments', async () => {
    const writeRole = createRoleDefinition('write-role-id', 'Owner');
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([writeRole]);
    mockFetchQuery.mockResolvedValue([]);

    const { result } = renderHook(() => useHasRoleAssignmentsWritePermissionQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });
});

describe('useRoleDefinitionsByIdQuery', () => {
  it('returns only the built-in roles matching the requested definition ids', async () => {
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([foundryUser, storageBlobDataContributor]);

    const { result } = renderHook(() => useRoleDefinitionsByIdQuery([foundryUserId, unknownRoleId]), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ [foundryUserId]: foundryUser });
    expect(mockRoleService.fetchRoleDefinitions).toHaveBeenCalledWith('', { $filter: "type eq 'BuiltInRole'" });
  });

  it('matches definition ids case-insensitively', async () => {
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([foundryUser]);

    const upperCaseId = foundryUserId.toUpperCase();
    const { result } = renderHook(() => useRoleDefinitionsByIdQuery([upperCaseId]), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ [upperCaseId]: foundryUser });
  });
});

describe('useHasRequiredRoleDefinitionsQuery', () => {
  it('returns true when no role definitions are missing', async () => {
    const assignments = [createRoleAssignment(foundryUser.id), createRoleAssignment(storageBlobDataContributor.id)];
    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const { result } = renderHook(() => useHasRequiredRoleDefinitionsQuery(resourceId, definitionIds), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('returns false when some role definitions are missing', async () => {
    mockFetchQuery.mockResolvedValueOnce([]).mockResolvedValueOnce(definitions);

    const { result } = renderHook(() => useHasRequiredRoleDefinitionsQuery(resourceId, definitionIds), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });
});
