import type { ArmResource, RoleAssignment, RoleDefinition } from '@microsoft/logic-apps-shared';
import { describe, expect, it, vi } from 'vitest';
import { getMissingRoleDefinitions, roleQueryKeys } from '../role';

const mockFetchQuery = vi.fn();

vi.mock('@microsoft/logic-apps-shared', () => ({
  RoleService: vi.fn(() => ({
    fetchAppRoleAssignmentsForResource: vi.fn(),
    fetchRoleDefinitions: vi.fn(),
  })),
  isUndefinedOrEmptyString: vi.fn((value) => !value),
}));

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

describe('getMissingRoleDefinitions', () => {
  const azureAiDeveloper = createRoleDefinition('role-def-1', 'Azure AI Developer');
  const storageBlobDataContributor = createRoleDefinition('role-def-2', 'Storage Blob Data Contributor');
  const definitionNames = ['Azure AI Developer', 'Storage Blob Data Contributor'];
  const definitions: Record<string, ArmResource<RoleDefinition>> = {
    'Azure AI Developer': azureAiDeveloper,
    'Storage Blob Data Contributor': storageBlobDataContributor,
  };

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
});
