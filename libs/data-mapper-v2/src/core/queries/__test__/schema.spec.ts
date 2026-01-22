import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSelectedSchema } from '../schema';
import { DataMapperApiServiceInstance } from '../../services';
import type { DataMapSchema } from '@microsoft/logic-apps-shared';

// Mock the API service
vi.mock('../../services', () => ({
  DataMapperApiServiceInstance: vi.fn(),
}));

describe('queries/schema', () => {
  const mockSchema: DataMapSchema = {
    name: 'TestSchema.xsd',
    type: 'XML',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSelectedSchema', () => {
    it('should return schema from the API', async () => {
      const mockGetSchemaFile = vi.fn().mockResolvedValue(mockSchema);

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: vi.fn(),
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: mockGetSchemaFile,
      });

      const result = await getSelectedSchema('TestSchema.xsd', '/schemas/TestSchema.xsd');

      expect(result).toEqual(mockSchema);
      expect(mockGetSchemaFile).toHaveBeenCalledWith('TestSchema.xsd', '/schemas/TestSchema.xsd');
    });

    it('should call service with correct parameters', async () => {
      const mockGetSchemaFile = vi.fn().mockResolvedValue(mockSchema);

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: vi.fn(),
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: mockGetSchemaFile,
      });

      await getSelectedSchema('Source.xsd', '/path/to/Source.xsd');

      expect(mockGetSchemaFile).toHaveBeenCalledWith('Source.xsd', '/path/to/Source.xsd');
    });

    it('should handle different file paths', async () => {
      const mockGetSchemaFile = vi.fn().mockResolvedValue(mockSchema);

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: vi.fn(),
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: mockGetSchemaFile,
      });

      await getSelectedSchema('schema.json', '/very/long/path/to/schema.json');

      expect(mockGetSchemaFile).toHaveBeenCalledWith('schema.json', '/very/long/path/to/schema.json');
    });

    it('should propagate API errors', async () => {
      const error = new Error('Schema not found');
      const mockGetSchemaFile = vi.fn().mockRejectedValue(error);

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: vi.fn(),
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: mockGetSchemaFile,
      });

      await expect(getSelectedSchema('NonExistent.xsd', '/path/NonExistent.xsd')).rejects.toThrow('Schema not found');
    });
  });
});
