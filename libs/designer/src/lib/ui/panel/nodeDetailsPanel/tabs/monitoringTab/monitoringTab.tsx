import constants from '../../../../../common/constants';
import { getMonitoringTabError } from '../../../../../common/utilities/error';
import { useBrandColor } from '../../../../../core/state/operation/operationSelector';
import { useActionMetadata, useRunData } from '../../../../../core/state/workflow/workflowSelectors';
import { InputsPanel } from './inputsPanel';
import { OutputsPanel } from './outputsPanel';
import { PropertiesPanel } from './propertiesPanel';
import { RunService, isNullOrUndefined, HostService, isNullOrEmpty, getPropertyValue, equals } from '@microsoft/logic-apps-shared';
import { ErrorSection, ValueLink } from '@microsoft/designer-ui';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';

export const MonitoringPanel: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = useRunData(selectedNodeId);
  const actionMetadata = useActionMetadata(selectedNodeId);
  const nodeType = actionMetadata?.type ?? '';

  const { status: statusRun, error: errorRun, code: codeRun } = runMetaData ?? {};
  const error = getMonitoringTabError(errorRun, statusRun, codeRun);
  const intl = useIntl();

  const getActionInputsOutputs = () => {
    return RunService().getActionLinks(runMetaData, selectedNodeId);
  };

  const intlText = {
    showLogicAppRun: intl.formatMessage({
      defaultMessage: 'Show Logic App run details',
      id: 'y6aoMi',
      description: 'Show Logic App run details text',
    }),
  };

  const getChildRunNameFromOutputs = (outputs: any): string | undefined => {
    if (!isNullOrEmpty(outputs)) {
      const headers = getPropertyValue(outputs, 'headers');
      if (headers && headers.value) {
        return getPropertyValue(headers.value, 'x-ms-workflow-run-id');
      }
    }

    return undefined;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isChildWorkflowRunDetailAvailable = (nodeType: string, outputs: any): boolean => {
    const runName = getChildRunNameFromOutputs(outputs);
    return equals(nodeType, constants.NODE.TYPE.WORKFLOW) && !!runName;
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

  const showFooterLink = useMemo(() => {
    return (
      !!HostService() && !!HostService().openMonitorView && isChildWorkflowRunDetailAvailable(nodeType?.toLowerCase(), inputOutputs.outputs)
    );
  }, [inputOutputs.outputs, isChildWorkflowRunDetailAvailable, nodeType]);

  return isNullOrUndefined(runMetaData) ? null : (
    <>
      <ErrorSection error={error} />
      <ValueLink linkText={intlText.showLogicAppRun} visible={showFooterLink} onLinkClick={() => {}} />
      <InputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
        values={inputOutputs.inputs}
      />
      <OutputsPanel
        runMetaData={runMetaData}
        brandColor={brandColor}
        isLoading={isFetching || isLoading}
        isError={isError}
        nodeId={selectedNodeId}
        values={inputOutputs.outputs}
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
