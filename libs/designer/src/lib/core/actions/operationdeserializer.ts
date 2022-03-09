import { createListenerMiddleware, addListener } from '@reduxjs/toolkit'
import type { TypedStartListening, TypedAddListener } from '@reduxjs/toolkit'

import { initializeGraphState } from '../parsers/ParseReduxAction';
import { useDispatch } from 'react-redux';
import { initializeOperationInfo } from '../state/operationMetadata';

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: initializeGraphState.fulfilled,
  effect: async (action, listenerApi) => {
    const dispatch = useDispatch();
    const { actionData } = action.payload;
    console.log("there are over ", Object.keys(actionData).length, " entries in actions");
    dispatch(initializeOperationInfo({
      id: 'manual',
      connectorId: '/manual',
      operationId: 'manualOperation'
    }));
  }
})