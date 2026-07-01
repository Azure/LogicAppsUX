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
  useHasRoleDefinitionsByNameQuery,
  useResourceRoleDefinitionsQuery,
  useRoleDefinitionsByNameQuery,
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

const createRoleDefinition = (id: string, roleName: string): ArmResource<RoleDefinition> =>
  ({
    id,
    name: roleName,
    properties: {
      roleName,
    },
  }) as ArmResource<RoleDefinition>;

const createRoleAssignment = (roleDefinitionId: string, scope = resourceId): ArmResource<RoleAssignment> =>
  ({
    properties: {
      roleDefinitionId: `/providers/Microsoft.Authorization/roleDefinitions/${roleDefinitionId}`,
      scope,
    },
  }) as ArmResource<RoleAssignment>;

const azureAiDeveloper = createRoleDefinition('role-def-1', 'Azure AI Developer');
const storageBlobDataContributor = createRoleDefinition('role-def-2', 'Storage Blob Data Contributor');
const definitionNames = ['Azure AI Developer', 'Storage Blob Data Contributor'];
const definitions: Record<string, ArmResource<RoleDefinition>> = {
  'Azure AI Developer': azureAiDeveloper,
  'Storage Blob Data Contributor': storageBlobDataContributor,
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
    const result = await getMissingRoleDefinitions('', ['Azure AI Developer']);

    expect(result).toEqual([]);
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it('returns empty array when definitionNames is empty', async () => {
    const result = await getMissingRoleDefinitions(resourceId, []);

    expect(result).toEqual([]);
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it('returns all definitions when no existing assignments', async () => {
    mockFetchQuery.mockResolvedValueOnce([]).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionNames);

    expect(result).toEqual([azureAiDeveloper, storageBlobDataContributor]);
    expect(mockFetchQuery).toHaveBeenCalledTimes(2);
    expect(mockFetchQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ queryKey: [roleQueryKeys.appIdentityRoleAssignments, resourceId] })
    );
    expect(mockFetchQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ queryKey: [roleQueryKeys.roleDefinitions, 'byName', definitionNames] })
    );
  });

  it('returns empty array when all roles are already assigned', async () => {
    const assignments = [createRoleAssignment(azureAiDeveloper.id), createRoleAssignment(storageBlobDataContributor.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionNames);

    expect(result).toEqual([]);
  });

  it('returns only missing roles when only some roles are assigned', async () => {
    const assignments = [createRoleAssignment(azureAiDeveloper.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionNames);

    expect(result).toEqual([storageBlobDataContributor]);
  });

  it('returns empty array when no definitions found', async () => {
    mockFetchQuery.mockResolvedValueOnce([createRoleAssignment('role-def-1')]).mockResolvedValueOnce({});

    const result = await getMissingRoleDefinitions(resourceId, ['Azure AI Developer']);

    expect(result).toEqual([]);
  });

  it('skips requested names with no matching definition when assignments exist', async () => {
    // e.g. 'Azure AI User' is not returned as a built-in role in some environments
    const assignments = [createRoleAssignment(azureAiDeveloper.id)];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, ['Azure AI User', ...definitionNames]);

    expect(result).toEqual([storageBlobDataContributor]);
  });

  it('does not throw when an assignment has no roleDefinitionId', async () => {
    const assignments = [{ properties: { scope: resourceId } } as ArmResource<RoleAssignment>];

    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const result = await getMissingRoleDefinitions(resourceId, definitionNames);

    expect(result).toEqual([azureAiDeveloper, storageBlobDataContributor]);
  });
});

describe('useResourceRoleDefinitionsQuery', () => {
  it('fetches role definitions for the resource', async () => {
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([azureAiDeveloper]);

    const { result } = renderHook(() => useResourceRoleDefinitionsQuery(resourceId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([azureAiDeveloper]);
    expect(mockRoleService.fetchRoleDefinitions).toHaveBeenCalledWith(resourceId);
  });
});

describe('useUserRoleAssignmentsForResourceQuery', () => {
  it('fetches user role assignments for the resource', async () => {
    const assignments = [createRoleAssignment(azureAiDeveloper.id)];
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

describe('useRoleDefinitionsByNameQuery', () => {
  it('returns only the built-in roles matching the requested names', async () => {
    mockRoleService.fetchRoleDefinitions.mockResolvedValue([azureAiDeveloper, storageBlobDataContributor]);

    const { result } = renderHook(() => useRoleDefinitionsByNameQuery(['Azure AI Developer', 'Azure AI User']), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ 'Azure AI Developer': azureAiDeveloper });
    expect(mockRoleService.fetchRoleDefinitions).toHaveBeenCalledWith('', { $filter: "type eq 'BuiltInRole'" });
  });
});

describe('useHasRoleDefinitionsByNameQuery', () => {
  it('returns true when no role definitions are missing', async () => {
    const assignments = [createRoleAssignment(azureAiDeveloper.id), createRoleAssignment(storageBlobDataContributor.id)];
    mockFetchQuery.mockResolvedValueOnce(assignments).mockResolvedValueOnce(definitions);

    const { result } = renderHook(() => useHasRoleDefinitionsByNameQuery(resourceId, definitionNames), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('returns false when some role definitions are missing', async () => {
    mockFetchQuery.mockResolvedValueOnce([]).mockResolvedValueOnce(definitions);

    const { result } = renderHook(() => useHasRoleDefinitionsByNameQuery(resourceId, definitionNames), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });
});
