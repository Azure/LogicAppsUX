// import { createSlice } from '@reduxjs/toolkit';
// import type { PayloadAction } from '@reduxjs/toolkit';

export interface OperationIds {
  connectorId: string;
  operationId: string;
}

// export interface OperationMetadataState {
//   operationInfo: Record<string, OperationIds>;
// }

// const initialState: OperationMetadataState = {
//   operationInfo: {},
// };

// interface AddOperationInfoPayload extends OperationIds {
//   id: string;
// }

// export const operationMetadataSlice = createSlice({
//   name: 'operationMetadata',
//   initialState,
//   reducers: {
//     initializeOperationInfo: (state, action: PayloadAction<AddOperationInfoPayload>) => {
//       const { id, connectorId, operationId } = action.payload;
//       state.operationInfo[id] = { connectorId, operationId };
//     },
//   },
// });

// // Action creators are generated for each case reducer function
// export const { initializeOperationInfo } = operationMetadataSlice.actions;

// export default operationMetadataSlice.reducer;
