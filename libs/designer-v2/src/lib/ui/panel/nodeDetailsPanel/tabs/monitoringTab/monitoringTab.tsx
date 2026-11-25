import constants from '../../../../../common/constants';
import { getMonitoringTabError } from '../../../../../common/utilities/error';
import { useBrandColor } from '../../../../../core/state/operation/operationSelector';
import { useRunData, useSelectedLoopRepetition } from '../../../../../core/state/workflow/workflowSelectors';
import { useRawInputsOutputs } from '../../useRawInputsOutputs';
import { InputsPanel } from './inputsPanel';
import { OutputsPanel } from './outputsPanel';
import { PropertiesPanel } from './propertiesPanel';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { ErrorSection } from '@microsoft/designer-ui';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../../core';
import { initializeInputsOutputsBinding } from '../../../../../core/actions/bjsworkflow/monitoring';
import { useSharedNodeUi } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { makeStyles, tokens } from '@fluentui/react-components';
import { MonitoringPayloadComparison } from '@microsoft/designer-ui-v2';

const useStyles = makeStyles({
  comparisonLayout: {
    marginBlockStart: tokens.spacingVerticalL,
    // The comparison grid owns section spacing instead of the old vertical margins.
    '& .msla-trace-inputs-outputs': {
      marginBlock: 0,
    },
    // Allow long translated expand/raw labels to wrap without clipping their controls.
    '& .msla-trace-inputs-outputs-header': {
      flexWrap: 'wrap',
    },
    '& .msla-trace-inputs-outputs-header > button': {
      minInlineSize: 0,
      maxInlineSize: '100%',
      height: 'auto',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
    },
    '& .msla-trace-inputs-outputs-header > button .fui-Button__icon': {
      flexShrink: 0,
    },
    '& .msla-trace-inputs-outputs-header-text': {
      minInlineSize: 0,
      overflowWrap: 'anywhere',
    },
    '& .msla-trace-download-link > a': {
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
    },
  },
});

export const MonitoringPanel: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = useRunData(selectedNodeId);
  const loopRepetition = useSelectedLoopRepetition(selectedNodeId);
  const dispatch = useDispatch<AppDispatch>();
  const { status: statusRun, error: errorRun, code: codeRun } = runMetaData ?? {};
  const error = getMonitoringTabError(errorRun, statusRun, codeRun);

  const { data: inputOutputs, isError, isFetching, isLoading, isPlaceholderData } = useRawInputsOutputs(selectedNodeId);

  const actionTrackingId = runMetaData?.correlation?.actionTrackingId;
  const startTime = runMetaData?.startTime;
  const endTime = runMetaData?.endTime;
  const hasCurrentInputsOutputs = !loopRepetition || (!!runMetaData && !isPlaceholderData && !!inputOutputs?.loopPayloadRevision);

  useEffect(() => {
    if (!isLoading && inputOutputs && hasCurrentInputsOutputs) {
      dispatch(
        initializeInputsOutputsBinding({
          nodeId: selectedNodeId,
          inputsOutputs: inputOutputs as any,
          ...(loopRepetition && { loopRepetition, loopPayloadRevision: inputOutputs.loopPayloadRevision }),
        })
      );
    }
  }, [dispatch, inputOutputs, selectedNodeId, isLoading, actionTrackingId, startTime, endTime, loopRepetition, hasCurrentInputsOutputs]);

  const showPayloadComparison = useSharedNodeUi();
  const styles = useStyles();

  if (isNullOrUndefined(runMetaData)) {
    return null;
  }

  const inputsSection = (
    <InputsPanel
      runMetaData={runMetaData}
      brandColor={brandColor}
      isLoading={isFetching || isLoading}
      isError={isError}
      nodeId={selectedNodeId}
    />
  );

  const outputsSection = (
    <OutputsPanel
      runMetaData={runMetaData}
      brandColor={brandColor}
      isLoading={isFetching || isLoading}
      isError={isError}
      nodeId={selectedNodeId}
    />
  );

  const propertiesSection = <PropertiesPanel properties={runMetaData} brandColor={brandColor} nodeId={selectedNodeId} />;

  return (
    <>
      <ErrorSection error={error} />
      {showPayloadComparison ? (
        <MonitoringPayloadComparison
          className={styles.comparisonLayout}
          inputsSection={inputsSection}
          outputsSection={outputsSection}
          propertiesSection={propertiesSection}
        />
      ) : (
        <>
          {inputsSection}
          {outputsSection}
          {propertiesSection}
        </>
      )}
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
