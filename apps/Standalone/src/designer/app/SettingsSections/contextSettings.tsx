import { useQueryClient } from '@tanstack/react-query';
import { setHardCodedToken } from '../../../environments/environment';
import type { AppDispatch } from '../../state/store';
import {
  useAreCustomEditorsEnabled,
  useIsDarkMode,
  useIsMonitoringView,
  useIsReadOnly,
  useShowConnectionsPanel,
  useHostOptions,
  useShowPerformanceDebug,
  useSuppressDefaultNodeSelect,
  useStringOverrides,
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
  setShowPerformanceDebug,
  setSuppressDefaultNodeSelect,
  setStringOverrides,
} from '../../state/workflowLoadingSlice';
import { Checkbox, TextField } from '@fluentui/react';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

const ContextSettings = () => {
  const isReadOnly = useIsReadOnly();
  const isMonitoringView = useIsMonitoringView();
  const isDarkMode = useIsDarkMode();
  const showConnectionsPanel = useShowConnectionsPanel();
  const areCustomEditorsEnabled = useAreCustomEditorsEnabled();
  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelect();
  const hostOptions = useHostOptions();
  const showPerformanceDebug = useShowPerformanceDebug();
  const showTestStringOverride = useStringOverrides();
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

  const queryClient = useQueryClient();
  const [armToken, setArmToken] = useState<string>();

  const updateArmToken = useCallback(
    async (token: string) => {
      return queryClient.setQueryData<string>(['armToken'], () => token);
    },
    [queryClient]
  );

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
        label="Suppress default node click"
        checked={suppressDefaultNodeSelect}
        onChange={(_, checked) => dispatch(setSuppressDefaultNodeSelect(!!checked))}
      />
      <Checkbox
        label="Show Performance Debug"
        checked={showPerformanceDebug}
        onChange={(_, checked) => dispatch(setShowPerformanceDebug(!!checked))}
      />
      <Checkbox
        label="Test String Override"
        checked={showTestStringOverride}
        onChange={(_, checked) => {
          dispatch(
            setStringOverrides(
              checked
                ? {
                    g5A6Bn: 'Connector Type',
                    TRpSCQ: 'Action or Trigger',
                  }
                : undefined
            )
          );
        }}
      />
      <TextField
        label="ARM TOKEN"
        value={armToken}
        onChange={(_, value) => {
          setArmToken(value);
          setHardCodedToken(value as string);
          updateArmToken(value as string);
        }}
        />
    </div>
  );
};

export default ContextSettings;
