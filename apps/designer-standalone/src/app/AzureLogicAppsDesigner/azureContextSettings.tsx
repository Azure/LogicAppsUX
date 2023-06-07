import type { RootState, AppDispatch } from '../../state/store';
import {
  clearWorkflowDetails,
  loadWorkflow,
  setConsumption,
  setDarkMode,
  setIsChatBotEnabled,
  setIsLocalSelected,
  setMonitoringView,
  setReadOnly,
} from '../../state/workflowLoadingSlice';
import { Checkbox } from '@fluentui/react';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const AzureContextSettings = () => {
  const { readOnly, monitoringView, darkMode, isLocalSelected, consumption, showChatBot } = useSelector((state: RootState) => {
    return state.workflowLoader;
  });
  const dispatch = useDispatch<AppDispatch>();

  const handleCheckLocalSetting = (checked?: boolean) => {
    if (!checked) {
      dispatch(clearWorkflowDetails());
    }
    dispatch(setIsLocalSelected(!!checked));
  };

  const changeMonitoringView = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(setMonitoringView(!!checked));
      if (checked) {
        dispatch(loadWorkflow());
      }
    },
    [dispatch]
  );

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Checkbox
        label="Read Only"
        disabled={monitoringView}
        checked={readOnly}
        onChange={(_, checked) => dispatch(setReadOnly(!!checked))}
      />
      <Checkbox label="Dark Mode" checked={darkMode} onChange={(_, checked) => dispatch(setDarkMode(!!checked))} />
      <Checkbox label="isLocal" checked={isLocalSelected} onChange={(_, checked) => handleCheckLocalSetting(checked)} />
      <Checkbox label="Monitoring View" checked={monitoringView} onChange={changeMonitoringView} />
      {isLocalSelected && (
        <Checkbox label="Consumption" checked={consumption} onChange={(_, checked) => dispatch(setConsumption(!!checked))} />
      )}
      <Checkbox label="Chatbot" checked={showChatBot} onChange={(_, checked) => dispatch(setIsChatBotEnabled(!!checked))} />
    </div>
  );
};

export default AzureContextSettings;
