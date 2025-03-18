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
  useQueryCachePersist,
  useIsMultiVariableEnabled,
} from '../../state/workflowLoadingSelectors';
import {
  setDarkMode,
  setMonitoringView,
  setReadOnly,
  loadWorkflow,
  setAreCustomEditorsEnabled,
  setShowConnectionsPanel,
  setHostOptions,
  setShowPerformanceDebug,
  setSuppressDefaultNodeSelect,
  setStringOverrides,
  setQueryCachePersist,
  setEnableMultiVariable,
} from '../../state/workflowLoadingSlice';
import { Checkbox, TextField } from '@fluentui/react';
import { useCallback } from 'react';
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
  const queryCachePersist = useQueryCachePersist();
  const isMultiVariableEnabled = useIsMultiVariableEnabled();
  const dispatch = useDispatch<AppDispatch>();

  const changeMonitoringView = useCallback(
    (_: unknown, checked?: boolean) => {
      dispatch(setMonitoringView(!!checked));
      if (checked) {
        dispatch(loadWorkflow(_));
      }
    },
    [dispatch]
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
        label="Collapse Graphs"
        checked={hostOptions.collapseGraphsByDefault}
        onChange={(_, checked) => dispatch(setHostOptions({ collapseGraphsByDefault: !!checked }))}
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
      <Checkbox
        label="Query Cache Persist"
        checked={queryCachePersist}
        onChange={(_, checked) => dispatch(setQueryCachePersist(!!checked))}
      />
      <Checkbox
        label="Enable Multivariable"
        checked={isMultiVariableEnabled}
        onChange={(_, checked) => dispatch(setEnableMultiVariable(!!checked))}
      />
      <TextField
        label="Max State History Size"
        onChange={(_, newValue) => dispatch(setHostOptions({ maxStateHistorySize: Number.parseInt(newValue || '0') }))}
      />
    </div>
  );
};

export default ContextSettings;
