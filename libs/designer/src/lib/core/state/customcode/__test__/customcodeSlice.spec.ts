import { customCodeSlice, initialState } from '../customcodeSlice';
import type { CustomCodeState } from '../customcodeInterfaces';

describe('customCodeSlice reducers', () => {
  const { addOrUpdateCustomCode, deleteCustomCode, renameCustomCodeFile } = customCodeSlice.actions;

  it('should handle initial state', () => {
    expect(customCodeSlice.reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('renameCustomCodeFile', () => {
    it('should rename a file successfully when there are no duplicates', () => {
      const initialStateWithFiles: CustomCodeState = {
        files: {
          'Action1.csx': {
            nodeId: 'Action1',
            fileExtension: '.csx',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          'Action1': 'console.log("Hello World")',
        },
      };

      const newState = customCodeSlice.reducer(
        initialStateWithFiles,
        renameCustomCodeFile({
          oldFileName: 'Action1.csx',
          newFileName: 'RenamedAction.csx',
        })
      );

      expect(newState.files['RenamedAction.csx']).toBeDefined();
      expect(newState.files['RenamedAction.csx'].isDeleted).toBe(false);
      expect(newState.files['Action1.csx'].isDeleted).toBe(true);
    });

    it('should prevent renaming a CSharp file if a file with the same name already exists', () => {
      const initialStateWithFiles: CustomCodeState = {
        files: {
          'Action1.csx': {
            nodeId: 'Action1',
            fileExtension: '.csx',
            isModified: false,
            isDeleted: false,
          },
          'Action2.csx': {
            nodeId: 'Action2',
            fileExtension: '.csx',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          'Action1': 'console.log("Hello World 1")',
          'Action2': 'console.log("Hello World 2")',
        },
      };

      const newState = customCodeSlice.reducer(
        initialStateWithFiles,
        renameCustomCodeFile({
          oldFileName: 'Action1.csx',
          newFileName: 'Action2.csx', // Trying to rename to an existing name
        })
      );

      // The rename should be prevented, so the state should remain unchanged
      expect(newState.files['Action1.csx'].isDeleted).toBe(false);
      expect(newState.files['Action2.csx'].isDeleted).toBe(false);
      expect(newState.files['Action1.csx'].nodeId).toBe('Action1');
      expect(newState.files['Action2.csx'].nodeId).toBe('Action2');
    });

    it('should allow renaming non-CSharp files even if a file with the same name exists', () => {
      const initialStateWithFiles: CustomCodeState = {
        files: {
          'Action1.js': {
            nodeId: 'Action1',
            fileExtension: '.js',
            isModified: false,
            isDeleted: false,
          },
          'Action2.js': {
            nodeId: 'Action2',
            fileExtension: '.js',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          'Action1': 'console.log("Hello World 1")',
          'Action2': 'console.log("Hello World 2")',
        },
      };

      // For non-CSharp files, we don't apply the validation, so this should succeed
      // This is to maintain backward compatibility with the existing behavior
      const newState = customCodeSlice.reducer(
        initialStateWithFiles,
        renameCustomCodeFile({
          oldFileName: 'Action1.js',
          newFileName: 'Action2.js', // Trying to rename to an existing name
        })
      );

      // The rename should be allowed for non-CSharp files (to maintain existing behavior)
      // This will result in both files pointing to the same name
      expect(newState.files['Action1.js'].isDeleted).toBe(true);
      expect(newState.files['Action2.js']).toBeDefined();
    });
  });
});