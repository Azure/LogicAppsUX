import constants from '../../../../../common/constants';
import { getMonitoringTabError } from '../../../../../common/utilities/error';
import { useBrandColor, useRawInputParameters } from '../../../../../core/state/operation/operationSelector';
import { useRunData } from '../../../../../core/state/workflow/workflowSelectors';
import { InputsPanel } from './inputsPanel';
import { OutputsPanel } from './outputsPanel';
import { PropertiesPanel } from './propertiesPanel';
import { RunService, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { ErrorSection } from '@microsoft/designer-ui';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setRunDataInputOutputs } from '../../../../../core/state/workflow/workflowSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../../core';
import { parseInputs, parseOutputs } from './helpers';

export const MonitoringPanel: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = useRunData(selectedNodeId);
  const dispatch = useDispatch<AppDispatch>();
  const rawInputs = useRawInputParameters(selectedNodeId);
  const { status: statusRun, error: errorRun, code: codeRun } = runMetaData ?? {};
  const error = getMonitoringTabError(errorRun, statusRun, codeRun);

  const getActionInputsOutputs = () => {
    return RunService().getActionLinks(runMetaData, selectedNodeId);
  };

  const {
    data: inputOutputs,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<any>(['actionInputsOutputs', { nodeId: selectedNodeId }], getActionInputsOutputs, {
    refetchOnWindowFocus: false,
    initialData: { inputs: {}, outputs: {} },
  });

  useEffect(() => {
    refetch();
  }, [runMetaData, refetch]);

  useEffect(() => {
    dispatch(
      setRunDataInputOutputs({
        nodeId: selectedNodeId,
        inputs: parseInputs(inputOutputs.inputs, rawInputs),
        outputs: parseOutputs(inputOutputs.outputs),
      })
    );
  }, [dispatch, inputOutputs, selectedNodeId, rawInputs]);

  return isNullOrUndefined(runMetaData) ? null : (
    <>
      <ErrorSection error={error} />
      <InputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
      />
      <OutputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
      />
      <PropertiesPanel properties={runMetaData} brandColor={brandColor} nodeId={selectedNodeId} />
    </>
  );
};

export const monitoringTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.MONITORING,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'xi2tn6',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Monitoring tab',
    id: 'OkGMwC',
    description: 'An accessibility label that describes the monitoring tab',
  }),
  visible: true,
  content: <MonitoringPanel {...props} />,
  order: 0,
  icon: 'Info',
});
