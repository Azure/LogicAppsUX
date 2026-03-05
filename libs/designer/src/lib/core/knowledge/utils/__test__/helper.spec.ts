import { createKnowledgeHub } from '../helper';
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
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub/${groupName}`,
        'PUT',
        {
          'api-version': '2025-11-01',
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
});
