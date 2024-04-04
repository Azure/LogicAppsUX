import type { AppDispatch } from '../../state/store';
import {
  useAreCustomEditorsEnabled,
  useIsDarkMode,
  useIsMonitoringView,
  useIsReadOnly,
  useShowConnectionsPanel,
  useHostOptions,
} from '../../state/workflowLoadingSelectors';
import {
  setDarkMode,
  setMonitoringView,
  setReadOnly,
  loadRun,
  loadWorkflow,
  setAreCustomEditorsEnabled,
  setShowConnectionsPanel,
  setHostOptions,
} from '../../state/workflowLoadingSlice';
import { Checkbox } from '@fluentui/react';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

const ContextSettings = () => {
  const isReadOnly = useIsReadOnly();
  const isMonitoringView = useIsMonitoringView();
  const isDarkMode = useIsDarkMode();
  const showConnectionsPanel = useShowConnectionsPanel();
  const areCustomEditorsEnabled = useAreCustomEditorsEnabled();
  const hostOptions = useHostOptions();
  const dispatch = useDispatch<AppDispatch>();

  const changeMonitoringView = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(setMonitoringView(!!checked));
      if (checked) {
        dispatch(loadRun());
        dispatch(loadWorkflow());
      }
    },
    [dispatch]
  );

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Checkbox
        label="Read Only"
        disabled={isMonitoringView}
        checked={isReadOnly}
        onChange={(_, checked) => dispatch(setReadOnly(!!checked))}
      />
      <Checkbox label="Monitoring View" checked={isMonitoringView} onChange={changeMonitoringView} />
      <Checkbox label="Dark Mode" checked={isDarkMode} onChange={(_, checked) => dispatch(setDarkMode(!!checked))} />
      <Checkbox
        label="Custom Editors"
        checked={areCustomEditorsEnabled}
        onChange={(_, checked) => dispatch(setAreCustomEditorsEnabled(!!checked))}
      />
      <Checkbox
        label="Connections Panel"
        checked={showConnectionsPanel}
        onChange={(_, checked) => dispatch(setShowConnectionsPanel(!!checked))}
      />
      <Checkbox
        label="Display Runtime Info"
        checked={hostOptions.displayRuntimeInfo}
        onChange={(_, checked) => dispatch(setHostOptions({ displayRuntimeInfo: !!checked }))}
      />
      <Checkbox
        label="Force Enable Split-On"
        checked={hostOptions.forceEnableSplitOn}
        onChange={(_, checked) => dispatch(setHostOptions({ forceEnableSplitOn: !!checked }))}
      />
    </div>
  );
};

export default ContextSettings;
