import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

import { initializeGraphState } from '../parsers/ParseReduxAction';
import { useDispatch } from 'react-redux';
import { initializeOperationInfo } from '../state/operationMetadataSlice';

export const operationDeserializer = createListenerMiddleware();

operationDeserializer.startListening({
  actionCreator: initializeGraphState.fulfilled,
  effect: async (action, listenerApi) => {
    const dispatch = listenerApi.dispatch;
    const { actionData } = action.payload;
    console.log("there are over ", Object.keys(actionData).length, " entries in actions");
    dispatch(initializeOperationInfo({
      id: 'manual',
      connectorId: '/manual',
      operationId: 'manualOperation'
    }));
  }
});
