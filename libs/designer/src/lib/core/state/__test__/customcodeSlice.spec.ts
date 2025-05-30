import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import {
  CustomCodeState,
  AddCustomCodePayload,
  DeleteCustomCodePayload,
  RenameCustomCodePayload,
} from '../customcode/customcodeInterfaces';
import reducer, {
  initialState,
  initCustomCode,
  addOrUpdateCustomCode,
  deleteCustomCode,
  renameCustomCodeFile,
  resetCustomCode,
} from '../customcode/customcodeSlice';
import { setStateAfterUndoRedo } from '../global';
import { resetWorkflowState } from '../global';

describe('customcode slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        files: {},
        fileData: {},
      });
    });
  });

  describe('initCustomCode', () => {
    it('should initialize custom code with valid data', () => {
      const customCodeData = {
        'node1.js': 'console.log("test1");',
        'node2.py': 'print("test2")',
        'node3.cs': 'Console.WriteLine("test3");',
      };

      const action = initCustomCode(customCodeData);
      const newState = reducer(initialState, action);

      expect(newState.files).toEqual({
        'node1.js': {
          nodeId: 'node1',
          fileExtension: 'js',
          isModified: false,
          isDeleted: false,
        },
        'node2.py': {
          nodeId: 'node2',
          fileExtension: 'py',
          isModified: false,
          isDeleted: false,
        },
        'node3.cs': {
          nodeId: 'node3',
          fileExtension: 'cs',
          isModified: false,
          isDeleted: false,
        },
      });
      expect(newState.fileData).toEqual({
        node1: 'console.log("test1");',
        node2: 'print("test2")',
        node3: 'Console.WriteLine("test3");',
      });
    });

    it('should handle undefined custom code data', () => {
      const action = initCustomCode(undefined);
      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });

    it('should handle empty custom code data', () => {
      const action = initCustomCode({});
      const newState = reducer(initialState, action);

      expect(newState).toEqual({
        files: {},
        fileData: {},
      });
    });

    it('should initialize over existing state', () => {
      const existingState: CustomCodeState = {
        files: {
          'existing.js': {
            nodeId: 'existing',
            fileExtension: 'js',
            isModified: true,
            isDeleted: false,
          },
        },
        fileData: {
          existing: 'existing code',
        },
      };

      const customCodeData = {
        'node1.js': 'console.log("new");',
      };

      const action = initCustomCode(customCodeData);
      const newState = reducer(existingState, action);

      expect(newState.files).toEqual({
        'existing.js': {
          nodeId: 'existing',
          fileExtension: 'js',
          isModified: true,
          isDeleted: false,
        },
        'node1.js': {
          nodeId: 'node1',
          fileExtension: 'js',
          isModified: false,
          isDeleted: false,
        },
      });
      expect(newState.fileData).toEqual({
        existing: 'existing code',
        node1: 'console.log("new");',
      });
    });
  });

  describe('addOrUpdateCustomCode', () => {
    it('should add new custom code file', () => {
      const payload: AddCustomCodePayload = {
        nodeId: 'node1',
        fileData: 'console.log("hello");',
        fileExtension: 'js',
        fileName: 'node1.js',
      };

      const action = addOrUpdateCustomCode(payload);
      const newState = reducer(initialState, action);

      expect(newState.files['node1.js']).toEqual({
        nodeId: 'node1',
        fileExtension: 'js',
        isModified: true,
        isDeleted: false,
      });
      expect(newState.fileData.node1).toBe('console.log("hello");');
    });

    it('should update existing custom code file', () => {
      const existingState: CustomCodeState = {
        files: {
          'node1.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'old code',
        },
      };

      const payload: AddCustomCodePayload = {
        nodeId: 'node1',
        fileData: 'new code',
        fileExtension: 'js',
        fileName: 'node1.js',
      };

      const action = addOrUpdateCustomCode(payload);
      const newState = reducer(existingState, action);

      expect(newState.files['node1.js']).toEqual({
        nodeId: 'node1',
        fileExtension: 'js',
        isModified: true,
        isDeleted: false,
      });
      expect(newState.fileData.node1).toBe('new code');
    });

    it('should not update when file data is the same', () => {
      const existingState: CustomCodeState = {
        files: {
          'node1.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'same code',
        },
      };

      const payload: AddCustomCodePayload = {
        nodeId: 'node1',
        fileData: 'same code',
        fileExtension: 'js',
        fileName: 'node1.js',
      };

      const action = addOrUpdateCustomCode(payload);
      const newState = reducer(existingState, action);

      expect(newState).toBe(existingState); // Should return same reference when no change
    });

    it('should mark old files as deleted when adding new file for same node', () => {
      const existingState: CustomCodeState = {
        files: {
          'node1.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: false,
            isDeleted: false,
          },
          'node1.py': {
            nodeId: 'node1',
            fileExtension: 'py',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'old code',
        },
      };

      const payload: AddCustomCodePayload = {
        nodeId: 'node1',
        fileData: 'new code',
        fileExtension: 'ts',
        fileName: 'node1.ts',
      };

      const action = addOrUpdateCustomCode(payload);
      const newState = reducer(existingState, action);

      expect(newState.files['node1.js'].isDeleted).toBe(true);
      expect(newState.files['node1.py'].isDeleted).toBe(true);
      expect(newState.files['node1.ts']).toEqual({
        nodeId: 'node1',
        fileExtension: 'ts',
        isModified: true,
        isDeleted: false,
      });
      expect(newState.fileData.node1).toBe('new code');
    });
  });

  describe('deleteCustomCode', () => {
    it('should delete custom code file and data', () => {
      const existingState: CustomCodeState = {
        files: {
          'node1.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'code to delete',
        },
      };

      const payload: DeleteCustomCodePayload = {
        nodeId: 'node1',
        fileName: 'node1.js',
      };

      const action = deleteCustomCode(payload);
      const newState = reducer(existingState, action);

      expect(newState.files['node1.js']).toEqual({
        nodeId: 'node1',
        fileExtension: '',
        isDeleted: true,
      });
      expect(newState.fileData.node1).toBeUndefined();
    });

    it('should handle deletion when file does not exist', () => {
      const payload: DeleteCustomCodePayload = {
        nodeId: 'nonexistent',
        fileName: 'nonexistent.js',
      };

      const action = deleteCustomCode(payload);
      const newState = reducer(initialState, action);

      expect(newState.files['nonexistent.js']).toEqual({
        nodeId: 'nonexistent',
        fileExtension: '',
        isDeleted: true,
      });
      expect(newState.fileData.nonexistent).toBeUndefined();
    });
  });

  describe('renameCustomCodeFile', () => {
    it('should rename custom code file', () => {
      const existingState: CustomCodeState = {
        files: {
          'oldName.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'file content',
        },
      };

      const payload: RenameCustomCodePayload = {
        oldFileName: 'oldName.js',
        newFileName: 'newName.js',
      };

      const action = renameCustomCodeFile(payload);
      const newState = reducer(existingState, action);

      expect(newState.files['newName.js']).toEqual({
        nodeId: 'node1',
        fileExtension: 'js',
        isModified: true,
        isDeleted: false,
      });
      expect(newState.files['oldName.js']).toEqual({
        nodeId: 'node1',
        fileExtension: 'js',
        isModified: false,
        isDeleted: true,
      });
    });

    it('should handle renaming non-existent file', () => {
      const payload: RenameCustomCodePayload = {
        oldFileName: 'nonexistent.js',
        newFileName: 'newName.js',
      };

      const action = renameCustomCodeFile(payload);
      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState); // Should return unchanged state
    });
  });

  describe('resetCustomCode', () => {
    it('should remove deleted files and reset modified flags', () => {
      const existingState: CustomCodeState = {
        files: {
          'keep.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: true,
            isDeleted: false,
          },
          'delete.js': {
            nodeId: 'node2',
            fileExtension: 'js',
            isModified: false,
            isDeleted: true,
          },
          'alsoKeep.py': {
            nodeId: 'node3',
            fileExtension: 'py',
            isModified: false,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'keep data',
          node2: 'delete data',
          node3: 'also keep data',
        },
      };

      const action = resetCustomCode();
      const newState = reducer(existingState, action);

      expect(newState.files).toEqual({
        'keep.js': {
          nodeId: 'node1',
          fileExtension: 'js',
          isModified: false,
          isDeleted: false,
        },
        'alsoKeep.py': {
          nodeId: 'node3',
          fileExtension: 'py',
          isModified: false,
          isDeleted: false,
        },
      });
      expect(newState.fileData).toEqual({
        node1: 'keep data',
        node2: 'delete data',
        node3: 'also keep data',
      });
    });

    it('should handle empty state', () => {
      const action = resetCustomCode();
      const newState = reducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });

  describe('extraReducers', () => {
    it('should reset to initial state on resetWorkflowState', () => {
      const existingState: CustomCodeState = {
        files: {
          'test.js': {
            nodeId: 'node1',
            fileExtension: 'js',
            isModified: true,
            isDeleted: false,
          },
        },
        fileData: {
          node1: 'test data',
        },
      };

      const action = resetWorkflowState();
      const newState = reducer(existingState, action);

      expect(newState).toEqual(initialState);
    });

    it('should set custom code state on undo redo', () => {
      const customCodeState: CustomCodeState = {
        files: {
          'test.js': {
            nodeId: 'test',
            fileExtension: 'js',
            isModified: true,
            isDeleted: false,
          },
        },
        fileData: { test: 'test data' },
      };

      const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
      const action = setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        customCode: customCodeState,
      });

      const newState = reducer(initialState, action);

      expect(newState).toEqual(customCodeState);
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      let state = initialState;

      // Initialize with some code
      state = reducer(
        state,
        initCustomCode({
          'node1.js': 'initial code',
        })
      );

      // Add new code for different node
      state = reducer(
        state,
        addOrUpdateCustomCode({
          nodeId: 'node2',
          fileData: 'node2 code',
          fileExtension: 'py',
          fileName: 'node2.py',
        })
      );

      // Update existing code
      state = reducer(
        state,
        addOrUpdateCustomCode({
          nodeId: 'node1',
          fileData: 'updated code',
          fileExtension: 'js',
          fileName: 'node1.js',
        })
      );

      // Rename a file
      state = reducer(
        state,
        renameCustomCodeFile({
          oldFileName: 'node2.py',
          newFileName: 'node2_renamed.py',
        })
      );

      expect(state.files).toEqual({
        'node1.js': {
          nodeId: 'node1',
          fileExtension: 'js',
          isModified: true,
          isDeleted: false,
        },
        'node2.py': {
          nodeId: 'node2',
          fileExtension: 'py',
          isModified: false,
          isDeleted: true,
        },
        'node2_renamed.py': {
          nodeId: 'node2',
          fileExtension: 'py',
          isModified: true,
          isDeleted: false,
        },
      });

      expect(state.fileData).toEqual({
        node1: 'updated code',
        node2: 'node2 code',
      });

      // Reset should clean up
      state = reducer(state, resetCustomCode());

      expect(state.files).toEqual({
        'node1.js': {
          nodeId: 'node1',
          fileExtension: 'js',
          isModified: false,
          isDeleted: false,
        },
        'node2_renamed.py': {
          nodeId: 'node2',
          fileExtension: 'py',
          isModified: false,
          isDeleted: false,
        },
      });
    });
  });
});
