import { initializeGraphState } from '../parsers/ParseReduxAction';
import type { RootState } from '../store';
import { InitializeOperationDetails } from './bjsworkflow/operationdeserializer';
import { createListenerMiddleware } from '@reduxjs/toolkit';

export const operationDeserializer = createListenerMiddleware();

operationDeserializer.startListening({
  actionCreator: initializeGraphState.fulfilled,
  effect: async (action, listenerApi) => {
    const { getState, dispatch } = listenerApi;
    const { actionData } = action.payload;
    const rootState = getState() as RootState;
    const {
      workflow: { workflowSpec },
    } = rootState;

    if (workflowSpec === 'BJS') {
      InitializeOperationDetails(actionData, getState as any, dispatch);
    } else {
      throw new Error('Spec not implemented.');
    }
  },
});
