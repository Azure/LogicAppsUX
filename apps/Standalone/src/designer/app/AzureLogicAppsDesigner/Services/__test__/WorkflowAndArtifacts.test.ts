import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchA2AAuthKey } from '../WorkflowAndArtifacts';
import { HybridAppUtility } from '../../Utilities/HybridAppUtilities';

// Mock axios
vi.mock('axios');

// Mock the environment
vi.mock('../../../../../environments/environment', () => ({
  environment: {
    armToken: 'test-arm-token',
  },
}));

describe('fetchA2AAuthKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('when siteResourceId is a hybrid logic app', () => {
    const hybridSiteResourceId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.App/containerApps/myHybridApp';
    const workflowName = 'myWorkflow';

    it('should call HybridAppUtility.postProxy with correct parameters', async () => {
      const mockResponse = { key: 'hybrid-api-key', endpoint: 'https://example.com' };
      const postProxySpy = vi.spyOn(HybridAppUtility, 'postProxy').mockResolvedValue(mockResponse);

      const result = await fetchA2AAuthKey(hybridSiteResourceId, workflowName);

      expect(postProxySpy).toHaveBeenCalledWith(
        'https://management.azure.com/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.App/containerApps/myHybridApp/hostruntime/runtime/webhooks/workflow/api/management/workflows/myWorkflow/listApiKeys',
        {
          expiry: '2026-02-24T12:00:00.000Z', // 24 hours later
          keyType: 'Primary',
        },
        {
          Authorization: 'Bearer test-arm-token',
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use listDraftApiKeys endpoint when isDraftMode is true', async () => {
      const mockResponse = { key: 'draft-api-key' };
      const postProxySpy = vi.spyOn(HybridAppUtility, 'postProxy').mockResolvedValue(mockResponse);

      await fetchA2AAuthKey(hybridSiteResourceId, workflowName, true);

      expect(postProxySpy).toHaveBeenCalledWith(expect.stringContaining('/listDraftApiKeys'), expect.any(Object), expect.any(Object));
    });

    it('should NOT call axios.post directly for hybrid apps', async () => {
      vi.spyOn(HybridAppUtility, 'postProxy').mockResolvedValue({ key: 'test' });

      await fetchA2AAuthKey(hybridSiteResourceId, workflowName);

      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('when siteResourceId is a standard logic app', () => {
    const standardSiteResourceId = '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myStandardApp';
    const workflowName = 'myWorkflow';

    it('should call axios.post with api-version query parameter', async () => {
      const mockResponse = { data: { key: 'standard-api-key', endpoint: 'https://example.com' } };
      (axios.post as any).mockResolvedValue(mockResponse);

      const result = await fetchA2AAuthKey(standardSiteResourceId, workflowName);

      expect(axios.post).toHaveBeenCalledWith(
        'https://management.azure.com/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myStandardApp/hostruntime/runtime/webhooks/workflow/api/management/workflows/myWorkflow/listApiKeys?api-version=2018-11-01',
        {
          expiry: '2026-02-24T12:00:00.000Z',
          keyType: 'Primary',
        },
        {
          headers: {
            Authorization: 'Bearer test-arm-token',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should use listDraftApiKeys endpoint when isDraftMode is true', async () => {
      const mockResponse = { data: { key: 'draft-api-key' } };
      (axios.post as any).mockResolvedValue(mockResponse);

      await fetchA2AAuthKey(standardSiteResourceId, workflowName, true);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/listDraftApiKeys?api-version=2018-11-01'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should NOT call HybridAppUtility.postProxy for standard apps', async () => {
      const postProxySpy = vi.spyOn(HybridAppUtility, 'postProxy');
      (axios.post as any).mockResolvedValue({ data: { key: 'test' } });

      await fetchA2AAuthKey(standardSiteResourceId, workflowName);

      expect(postProxySpy).not.toHaveBeenCalled();
    });
  });
});
