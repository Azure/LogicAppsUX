import type { WorkflowLoadingState } from './workflowLoadingSlice';

export const setStateHistory = (state: WorkflowLoadingState): void => {
  try {
    // Only save the state that we want to restore
    const filteredState = {
      resourcePath: state.resourcePath,
      appId: state.appId,
      workflowName: state.workflowName,
      runId: state.runId,
      language: state.language,
      isLocal: state.isLocal,
      isConsumption: state.isConsumption,
      isDarkMode: state.isDarkMode,
      isReadOnly: state.isReadOnly,
      isMonitoringView: state.isMonitoringView,
    };
    window.localStorage.setItem('msla-standalone-stateHistory', JSON.stringify(filteredState));
  } catch (e) {
    return;
  }
};

export const getStateHistory = (): any => {
  try {
    const state = window.localStorage.getItem('msla-standalone-stateHistory');
    if (!state) {
      return undefined;
    }
    return JSON.parse(state);
  } catch (e) {
    return undefined;
  }
};
