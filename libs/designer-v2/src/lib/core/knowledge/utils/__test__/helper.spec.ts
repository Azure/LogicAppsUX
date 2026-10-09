import { createKnowledgeHub, deleteKnowledgeHubArtifacts, validateHubNameAvailability, validateArtifactNameAvailability } from '../helper';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecuteResourceAction = vi.fn();
const mockLog = vi.fn();

vi.mock('@microsoft/logic-apps-shared', () => ({
  ResourceService: vi.fn(() => ({
    executeResourceAction: mockExecuteResourceAction,
  })),
  LoggerService: vi.fn(() => ({
    log: mockLog,
  })),
  LogEntryLevel: {
    Error: 'Error',
  },
  getIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
  isNullOrEmpty: (value: string | undefined | null) => value === undefined || value === null || value === '',
  equals: (a: string, b: string) => a?.toLowerCase() === b?.toLowerCase(),
  getObjectPropertyValue: (obj: any, path: string[]) => {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  },
}));

describe('knowledge helper utils', () => {
  const siteResourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';
  const groupName = 'my-knowledge-hub';
  const description = 'Test knowledge hub description';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createKnowledgeHub', () => {
    it('should call ResourceService with correct parameters', async () => {
      mockExecuteResourceAction.mockResolvedValue({ name: groupName });

      await createKnowledgeHub(siteResourceId, groupName, description);

      expect(mockExecuteResourceAction).toHaveBeenCalledTimes(1);
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/${groupName}`,
        'PUT',
        {
          'api-version': '2018-11-01',
          'Content-Type': 'application/json',
        },
        { description }
      );
    });

    it('should return response on success', async () => {
      const response = { name: groupName, id: 'hub-id' };
      mockExecuteResourceAction.mockResolvedValue(response);

      const result = await createKnowledgeHub(siteResourceId, groupName, description);

      expect(result).toEqual(response);
    });

    it('should log error and throw when API call fails', async () => {
      const errorResponse = { error: { code: 'BadRequest', message: 'Invalid hub name' } };
      mockExecuteResourceAction.mockRejectedValue(errorResponse);

      await expect(createKnowledgeHub(siteResourceId, groupName, description)).rejects.toThrow('Invalid hub name');

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.createKnowledgeHub',
        error: errorResponse.error,
        message: `Error while creating knowledge hub for the app: ${siteResourceId}`,
      });
    });

    it('should throw error when API call fails', async () => {
      mockExecuteResourceAction.mockRejectedValue({ error: { message: 'Failed' } });

      await expect(createKnowledgeHub(siteResourceId, groupName, description)).rejects.toThrow('Failed');
    });

    it('should handle error response without error property', async () => {
      mockExecuteResourceAction.mockRejectedValue({ message: 'Network error' });

      await expect(createKnowledgeHub(siteResourceId, groupName, description)).rejects.toThrow('Network error');

      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.createKnowledgeHub',
        error: { message: 'Network error' },
        message: `Error while creating knowledge hub for the app: ${siteResourceId}`,
      });
    });
  });

  describe('deleteKnowledgeHubArtifacts', () => {
    it('should call ResourceService to delete each hub', async () => {
      mockExecuteResourceAction.mockResolvedValue({});
      const hubs = ['hub1', 'hub2'];
      const artifacts = {};

      await deleteKnowledgeHubArtifacts(siteResourceId, hubs, artifacts);

      expect(mockExecuteResourceAction).toHaveBeenCalledTimes(2);
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hub1`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hub2`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
    });

    it('should call ResourceService to delete each artifact', async () => {
      mockExecuteResourceAction.mockResolvedValue({});
      const hubs: string[] = [];
      const artifacts = { artifact1: 'hubA', artifact2: 'hubB' };

      await deleteKnowledgeHubArtifacts(siteResourceId, hubs, artifacts);

      expect(mockExecuteResourceAction).toHaveBeenCalledTimes(2);
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hubA/artifacts/artifact1`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hubB/artifacts/artifact2`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
    });

    it('should delete both hubs and artifacts when both are provided', async () => {
      mockExecuteResourceAction.mockResolvedValue({});
      const hubs = ['hubToDelete'];
      const artifacts = { 'my-artifact': 'hubWithArtifact' };

      await deleteKnowledgeHubArtifacts(siteResourceId, hubs, artifacts);

      expect(mockExecuteResourceAction).toHaveBeenCalledTimes(2);
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hubToDelete`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/hubWithArtifact/artifacts/my-artifact`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      );
    });

    it('should return empty array when no hubs or artifacts are provided', async () => {
      const result = await deleteKnowledgeHubArtifacts(siteResourceId, [], {});

      expect(mockExecuteResourceAction).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return all resolved promises', async () => {
      const response1 = { deleted: 'hub1' };
      const response2 = { deleted: 'artifact1' };
      mockExecuteResourceAction.mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);

      const hubs = ['hub1'];
      const artifacts = { artifact1: 'hubA' };

      const result = await deleteKnowledgeHubArtifacts(siteResourceId, hubs, artifacts);

      expect(result).toEqual([response1, response2]);
    });

    it('should reject when any delete operation fails', async () => {
      const error = new Error('Delete failed');
      mockExecuteResourceAction.mockResolvedValueOnce({}).mockRejectedValueOnce(error);

      const hubs = ['hub1', 'hub2'];

      await expect(deleteKnowledgeHubArtifacts(siteResourceId, hubs, {})).rejects.toThrow('Delete failed');
    });
  });

  describe('validateHubNameAvailability', () => {
    it('should return error when hub name is empty', () => {
      const result = validateHubNameAvailability('', []);
      expect(result).toBe('Requires a unique hub name under 244 characters with only letters and numbers.');
    });

    it('should return error when hub name already exists (case-insensitive)', () => {
      const existingNames = ['MyHub', 'AnotherHub'];
      const result = validateHubNameAvailability('myhub', existingNames);
      expect(result).toBe('A hub with this name already exists.');
    });

    it('should return error when hub name is too long', () => {
      const longName = 'a'.repeat(245);
      const result = validateHubNameAvailability(longName, []);
      expect(result).toBe(`Hub name can't exceed 244 characters.`);
    });

    it('should return error when hub name contains special characters', () => {
      const result = validateHubNameAvailability('my-hub', []);
      expect(result).toBe('Enter a unique name under 244 characters with only letters and numbers.');
    });

    it('should return error when hub name contains spaces', () => {
      const result = validateHubNameAvailability('my hub', []);
      expect(result).toBe('Enter a unique name under 244 characters with only letters and numbers.');
    });

    it('should return error when hub name contains underscores', () => {
      const result = validateHubNameAvailability('my_hub', []);
      expect(result).toBe('Enter a unique name under 244 characters with only letters and numbers.');
    });

    it('should return undefined for valid hub name', () => {
      const result = validateHubNameAvailability('MyValidHub123', []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for valid hub name with max length', () => {
      const validName = 'a'.repeat(244);
      const result = validateHubNameAvailability(validName, []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for single character hub name', () => {
      const result = validateHubNameAvailability('H', []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for numeric hub name', () => {
      const result = validateHubNameAvailability('123456', []);
      expect(result).toBeUndefined();
    });

    it('should allow hub name not in existing list', () => {
      const existingNames = ['Hub1', 'Hub2'];
      const result = validateHubNameAvailability('Hub3', existingNames);
      expect(result).toBeUndefined();
    });
  });

  describe('validateArtifactNameAvailability', () => {
    it('should return error when artifact name is empty', () => {
      const result = validateArtifactNameAvailability('', []);
      expect(result).toBe('Requires a unique file artifact name under 80 characters with only letters and numbers.');
    });

    it('should return error when artifact name already exists (case-insensitive)', () => {
      const existingNames = ['MyArtifact', 'AnotherArtifact'];
      const result = validateArtifactNameAvailability('myartifact', existingNames);
      expect(result).toBe('An artifact with this name already exists in the hub.');
    });

    it('should return error when artifact name is too long', () => {
      const longName = 'a'.repeat(81);
      const result = validateArtifactNameAvailability(longName, []);
      expect(result).toBe(`File artifact name can't exceed 80 characters.`);
    });

    it('should return error when artifact name contains special characters', () => {
      const result = validateArtifactNameAvailability('my-artifact', []);
      expect(result).toBe('Enter a unique name under 80 characters with only letters and numbers.');
    });

    it('should return error when artifact name contains periods', () => {
      const result = validateArtifactNameAvailability('my.artifact', []);
      expect(result).toBe('Enter a unique name under 80 characters with only letters and numbers.');
    });

    it('should return error when artifact name contains spaces', () => {
      const result = validateArtifactNameAvailability('my artifact', []);
      expect(result).toBe('Enter a unique name under 80 characters with only letters and numbers.');
    });

    it('should return undefined for valid artifact name', () => {
      const result = validateArtifactNameAvailability('MyValidArtifact123', []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for valid artifact name with max length', () => {
      const validName = 'b'.repeat(80);
      const result = validateArtifactNameAvailability(validName, []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for single character artifact name', () => {
      const result = validateArtifactNameAvailability('A', []);
      expect(result).toBeUndefined();
    });

    it('should return undefined for numeric artifact name', () => {
      const result = validateArtifactNameAvailability('789012', []);
      expect(result).toBeUndefined();
    });

    it('should allow artifact name not in existing list', () => {
      const existingNames = ['Artifact1', 'Artifact2'];
      const result = validateArtifactNameAvailability('Artifact3', existingNames);
      expect(result).toBeUndefined();
    });
  });
});
