import { createKnowledgeHub, deleteKnowledgeHubArtifacts } from '../helper';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecuteResourceAction = vi.fn();
const mockLog = vi.fn();
const mockSetQueryData = vi.fn();

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
}));

vi.mock('../../../ReactQueryProvider', () => ({
  getReactQueryClient: vi.fn(() => ({
    setQueryData: mockSetQueryData,
  })),
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
        JSON.stringify({ description })
      );
    });

    it('should update query cache with new hub on success', async () => {
      const response = { name: groupName, id: 'hub-id' };
      mockExecuteResourceAction.mockResolvedValue(response);

      await createKnowledgeHub(siteResourceId, groupName, description);

      expect(mockSetQueryData).toHaveBeenCalledTimes(1);
      expect(mockSetQueryData).toHaveBeenCalledWith(['knowledgehubs', siteResourceId.toLowerCase()], expect.any(Function));

      // Verify the updater function works correctly
      const updater = mockSetQueryData.mock.calls[0][1];

      // When oldData is undefined
      const resultWithUndefined = updater(undefined);
      expect(resultWithUndefined).toEqual([{ name: groupName, description, artifacts: [] }]);

      // When oldData has existing hubs
      const existingHubs = [{ name: 'existing-hub', description: 'existing', artifacts: [] }];
      const resultWithExisting = updater(existingHubs);
      expect(resultWithExisting).toEqual([
        { name: 'existing-hub', description: 'existing', artifacts: [] },
        { name: groupName, description, artifacts: [] },
      ]);
    });

    it('should return response on success', async () => {
      const response = { name: groupName, id: 'hub-id' };
      mockExecuteResourceAction.mockResolvedValue(response);

      const result = await createKnowledgeHub(siteResourceId, groupName, description);

      expect(result).toEqual(response);
    });

    it('should log error when API call fails', async () => {
      const errorResponse = { error: { code: 'BadRequest', message: 'Invalid hub name' } };
      mockExecuteResourceAction.mockRejectedValue(errorResponse);

      await createKnowledgeHub(siteResourceId, groupName, description);

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.createKnowledgeHub',
        error: errorResponse.error,
        message: `Error while creating knowledge hub for the app: ${siteResourceId}`,
      });
    });

    it('should not update cache when API call fails', async () => {
      mockExecuteResourceAction.mockRejectedValue({ error: { message: 'Failed' } });

      await createKnowledgeHub(siteResourceId, groupName, description);

      expect(mockSetQueryData).not.toHaveBeenCalled();
    });

    it('should return undefined when API call fails', async () => {
      mockExecuteResourceAction.mockRejectedValue({ error: { message: 'Failed' } });

      const result = await createKnowledgeHub(siteResourceId, groupName, description);

      expect(result).toBeUndefined();
    });

    it('should handle error response without error property', async () => {
      mockExecuteResourceAction.mockRejectedValue({ message: 'Network error' });

      await createKnowledgeHub(siteResourceId, groupName, description);

      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.createKnowledgeHub',
        error: {},
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
});
