import { resetWorkflowState } from '../global';
import type { AddCustomCodePayload, CustomCodeState, DeleteCustomCodePayload, RenameCustomCodePayload } from './customcodeInterfaces';
import { splitFileName } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const initialState: CustomCodeState = {
  files: {},
  fileData: {},
};

export const customCodeSlice = createSlice({
  name: 'customCode',
  initialState,
  reducers: {
    initCustomCode: (state, action: PayloadAction<Record<string, string> | undefined>) => {
      const customCodeData = action.payload;
      if (!customCodeData) return;
      Object.entries(customCodeData).forEach(([fileName, fileData]) => {
        const [nodeId, fileExtension] = splitFileName(fileName);
        state.files[fileName] = {
          nodeId,
          fileExtension,
          isModified: false,
          isDeleted: false,
        };
        state.fileData[nodeId] = fileData;
      });
    },
    addOrUpdateCustomCode: (state, action: PayloadAction<AddCustomCodePayload>) => {
      const { nodeId, fileData, fileExtension, fileName } = action.payload;
      // only update if the fileData is different
      if (state.fileData[nodeId] === fileData) {
        return;
      }
      state.files[fileName] = { nodeId, fileExtension, isModified: true };
      // cycle through the old files, and mark as deleted to all that share the same nodeId
      Object.entries(state.files).forEach(([existingFileName, file]) => {
        if (file.nodeId === nodeId && existingFileName !== fileName) {
          state.files[existingFileName] = { ...file, isDeleted: true };
        }
      });
      state.fileData[nodeId] = fileData;
    },
    deleteCustomCode: (state, action: PayloadAction<DeleteCustomCodePayload>) => {
      const { nodeId, fileName } = action.payload;
      if (fileName) {
        state.files[fileName] = { nodeId, fileExtension: '', isDeleted: true };
      }
      delete state.fileData[nodeId];
    },
    renameCustomCode: (state, action: PayloadAction<RenameCustomCodePayload>) => {
      const { nodeId, oldFileName, newFileName } = action.payload;
      if (state.files[oldFileName]) {
        state.files[newFileName] = {
          ...state.files[oldFileName],
          isModified: true,
          isDeleted: false,
        };
      }
      // cycle through the existing files, and mark as deleted to all that share the same nodeId
      Object.entries(state.files).forEach(([fileName, file]) => {
        if (file.nodeId === nodeId && fileName !== newFileName) {
          state.files[fileName] = { ...file, isDeleted: true };
        }
      });
    },
    // on save we want to remove all deleted files and reset the modified flag
    resetCustomCode: (state) => {
      Object.entries(state.files).forEach(([fileName, file]) => {
        if (file.isDeleted) {
          delete state.files[fileName];
        } else {
          state.files[fileName] = { ...file, isModified: false };
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { initCustomCode, addOrUpdateCustomCode, deleteCustomCode, renameCustomCode, resetCustomCode } = customCodeSlice.actions;

export default customCodeSlice.reducer;
