import { describe, it, expect } from 'vitest';
import functionReducer, { loadFunctions, loadCustomXsltFilePaths, initialFunctionState, type FunctionState } from '../FunctionSlice';
import { FunctionCategory, type FunctionData } from '../../../models/Function';
import { NormalizedDataType, type IFileSysTreeItem } from '@microsoft/logic-apps-shared';

describe('FunctionSlice', () => {
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

  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = functionReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialFunctionState);
    });

    it('should have empty availableFunctions array as default', () => {
      const result = functionReducer(undefined, { type: 'unknown' });

      expect(result.availableFunctions).toEqual([]);
    });

    it('should have empty customXsltFilePaths array as default', () => {
      const result = functionReducer(undefined, { type: 'unknown' });

      expect(result.customXsltFilePaths).toEqual([]);
    });
  });

  describe('loadFunctions action', () => {
    it('should load functions when payload is provided', () => {
      const mockFunctions: FunctionData[] = [mockFunctionData];

      const result = functionReducer(initialFunctionState, loadFunctions(mockFunctions));

      expect(result.availableFunctions).toEqual(mockFunctions);
      expect(result.availableFunctions).toHaveLength(1);
    });

    it('should replace existing functions with new ones', () => {
      const existingState: FunctionState = {
        availableFunctions: [mockFunctionData],
        customXsltFilePaths: [],
      };
      const newFunction: FunctionData = {
        ...mockFunctionData,
        key: 'ToLower',
        functionName: 'lower-case',
        displayName: 'To Lower',
      };

      const result = functionReducer(existingState, loadFunctions([newFunction]));

      expect(result.availableFunctions).toHaveLength(1);
      expect(result.availableFunctions[0].key).toBe('ToLower');
    });

    it('should handle loading multiple functions', () => {
      const multipleFunctions: FunctionData[] = [
        mockFunctionData,
        { ...mockFunctionData, key: 'ToLower', displayName: 'To Lower' },
        { ...mockFunctionData, key: 'ToUpper', displayName: 'To Upper' },
      ];

      const result = functionReducer(initialFunctionState, loadFunctions(multipleFunctions));

      expect(result.availableFunctions).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const existingState: FunctionState = {
        availableFunctions: [mockFunctionData],
        customXsltFilePaths: [],
      };

      const result = functionReducer(existingState, loadFunctions([]));

      expect(result.availableFunctions).toEqual([]);
    });

    it('should not affect customXsltFilePaths when loading functions', () => {
      const existingState: FunctionState = {
        availableFunctions: [],
        customXsltFilePaths: [{ name: 'custom.xslt', type: 'file', fullPath: '/custom.xslt' }],
      };

      const result = functionReducer(existingState, loadFunctions([mockFunctionData]));

      expect(result.customXsltFilePaths).toHaveLength(1);
    });
  });

  describe('loadCustomXsltFilePaths action', () => {
    it('should load custom XSLT file paths when payload is provided', () => {
      const mockPaths: IFileSysTreeItem[] = [
        { name: 'custom1.xslt', type: 'file', fullPath: '/xslt/custom1.xslt' },
        { name: 'custom2.xslt', type: 'file', fullPath: '/xslt/custom2.xslt' },
      ];

      const result = functionReducer(initialFunctionState, loadCustomXsltFilePaths(mockPaths));

      expect(result.customXsltFilePaths).toEqual(mockPaths);
      expect(result.customXsltFilePaths).toHaveLength(2);
    });

    it('should replace existing paths with new ones', () => {
      const existingState: FunctionState = {
        availableFunctions: [],
        customXsltFilePaths: [{ name: 'old.xslt', type: 'file', fullPath: '/old.xslt' }],
      };
      const newPaths: IFileSysTreeItem[] = [{ name: 'new.xslt', type: 'file', fullPath: '/new.xslt' }];

      const result = functionReducer(existingState, loadCustomXsltFilePaths(newPaths));

      expect(result.customXsltFilePaths).toHaveLength(1);
      expect(result.customXsltFilePaths[0].name).toBe('new.xslt');
    });

    it('should handle empty array', () => {
      const existingState: FunctionState = {
        availableFunctions: [],
        customXsltFilePaths: [{ name: 'custom.xslt', type: 'file', fullPath: '/custom.xslt' }],
      };

      const result = functionReducer(existingState, loadCustomXsltFilePaths([]));

      expect(result.customXsltFilePaths).toEqual([]);
    });

    it('should not affect availableFunctions when loading custom paths', () => {
      const existingState: FunctionState = {
        availableFunctions: [mockFunctionData],
        customXsltFilePaths: [],
      };
      const newPaths: IFileSysTreeItem[] = [{ name: 'custom.xslt', type: 'file', fullPath: '/custom.xslt' }];

      const result = functionReducer(existingState, loadCustomXsltFilePaths(newPaths));

      expect(result.availableFunctions).toHaveLength(1);
    });

    it('should handle nested directory structure', () => {
      const mockPaths: IFileSysTreeItem[] = [
        {
          name: 'xslt',
          type: 'directory',
          fullPath: '/xslt',
          children: [
            { name: 'transform1.xslt', type: 'file', fullPath: '/xslt/transform1.xslt' },
            { name: 'transform2.xslt', type: 'file', fullPath: '/xslt/transform2.xslt' },
          ],
        },
      ];

      const result = functionReducer(initialFunctionState, loadCustomXsltFilePaths(mockPaths));

      expect(result.customXsltFilePaths).toEqual(mockPaths);
      expect(result.customXsltFilePaths[0].children).toHaveLength(2);
    });
  });
});
