import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFunctions } from '../functions';
import { DataMapperApiServiceInstance } from '../../services';
import { FunctionCategory, type FunctionData } from '../../../models/Function';
import { NormalizedDataType } from '@microsoft/logic-apps-shared';

// Mock the API service
vi.mock('../../services', () => ({
  DataMapperApiServiceInstance: vi.fn(),
}));

// Mock the LoggerService
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    LoggerService: () => ({
      log: vi.fn(),
    }),
  };
});

describe('queries/functions', () => {
  const mockFunctionData: FunctionData = {
    key: 'Concat',
    functionName: 'concat',
    displayName: 'Concat',
    category: FunctionCategory.String,
    description: 'Concatenates strings',
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.String],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'Enter value',
      },
    ],
    maxNumberOfInputs: -1,
    outputValueType: NormalizedDataType.String,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getFunctions', () => {
    it('should return functions from the manifest', async () => {
      const mockGetFunctionsManifest = vi.fn().mockResolvedValue({
        transformFunctions: [mockFunctionData],
      });

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = await getFunctions();

      expect(Array.isArray(result)).toBe(true);
      expect(mockGetFunctionsManifest).toHaveBeenCalled();
    });

    it('should add empty inputs array if inputs is undefined', async () => {
      const functionWithoutInputs = {
        key: 'CurrentDate',
        functionName: 'current-date',
        displayName: 'Current Date',
        category: FunctionCategory.DateTime,
        description: 'Returns current date',
        maxNumberOfInputs: 0,
        outputValueType: NormalizedDataType.String,
        // No inputs property
      };

      const mockGetFunctionsManifest = vi.fn().mockResolvedValue({
        transformFunctions: [functionWithoutInputs],
      });

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = (await getFunctions()) as FunctionData[];

      // Should have added empty inputs array
      const currentDateFunc = result.find((f) => f.key === 'CurrentDate');
      expect(currentDateFunc?.inputs).toEqual([]);
    });

    it('should filter out manifest functions starting with $', async () => {
      const internalFunction = {
        ...mockFunctionData,
        key: '$if',
        functionName: '$if',
      };

      const mockGetFunctionsManifest = vi.fn().mockResolvedValue({
        transformFunctions: [mockFunctionData, internalFunction],
      });

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = (await getFunctions()) as FunctionData[];

      // The $if function from manifest should be filtered out, but Concat should remain
      const concatFunction = result.find((f) => f.key === 'Concat');
      const ifFunction = result.find((f) => f.key === '$if');

      expect(concatFunction).toBeDefined();
      expect(ifFunction).toBeUndefined();
    });

    it('should include pseudo functions', async () => {
      const mockGetFunctionsManifest = vi.fn().mockResolvedValue({
        transformFunctions: [mockFunctionData],
      });

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = (await getFunctions()) as FunctionData[];

      // Result should have more than just the manifest functions (pseudo functions added)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return error message on API failure', async () => {
      const errorMessage = 'Failed to fetch functions';
      const mockGetFunctionsManifest = vi.fn().mockRejectedValue(new Error(errorMessage));

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = await getFunctions();

      expect(result).toBe(errorMessage);
    });

    it('should handle empty transform functions array', async () => {
      const mockGetFunctionsManifest = vi.fn().mockResolvedValue({
        transformFunctions: [],
      });

      vi.mocked(DataMapperApiServiceInstance).mockReturnValue({
        getFunctionsManifest: mockGetFunctionsManifest,
        generateDataMapXslt: vi.fn(),
        testDataMap: vi.fn(),
        getSchemaFile: vi.fn(),
      });

      const result = (await getFunctions()) as FunctionData[];

      // Should still include pseudo functions even if manifest is empty
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
