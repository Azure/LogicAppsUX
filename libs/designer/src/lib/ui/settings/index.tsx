import type { Settings } from '../../core/actions/bjsworkflow/settings';
import { useAllOperations, useIconUri, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import type { RootState } from '../../core/store';
import { DataHandling } from './sections/datahandling';
import { General } from './sections/general';
import { Networking } from './sections/networking';
import type { runAfterConfigs } from './sections/runafter';
import { RunAfter } from './sections/runafter';
import { Security } from './sections/security';
import { Tracking } from './sections/tracking';
import { useSelector } from 'react-redux';

export interface SectionProps extends Settings {
  readOnly: boolean | undefined;
  nodeId: string;
}

export const SettingsPanel = (): JSX.Element => {
  const nodeId = useSelector((state: RootState) => {
    return state.panel.selectedNode;
  });
  const {
    secureInputs,
    secureOutputs,
    asynchronous,
    disableAsyncPattern,
    disableAutomaticDecompression,
    suppressWorkflowHeaders,
    suppressWorkflowHeadersOnResponse,
    requestOptions,
    requestSchemaValidation,
    retryPolicy,
    timeout,
    trackedProperties,
    uploadChunk,
    splitOn,
    // splitOnConfiguration,
    paging,
    downloadChunkSize,
    concurrency,
    conditionExpressions,
    correlation,
    graphEdges,
  } = useSelector((state: RootState) => {
    return state.operations.settings[nodeId] ?? {};
  });

  // TODO: 14714481 We need to support all incoming edges (currently using all edges) and runAfterConfigMenu
  const incomingEdges = useAllOperations();
  const allEdges: Record<string, runAfterConfigs> = {};
  for (const key in incomingEdges) {
    allEdges[key] = GetEdgeInfo(key);
  }

  const renderGeneral = (): JSX.Element | null => {
    const generalSectionProps: SectionProps = {
      splitOn,
      timeout,
      concurrency,
      conditionExpressions,
      readOnly: false,
      nodeId,
    };
    if (splitOn !== undefined || timeout !== undefined || concurrency !== undefined || conditionExpressions !== undefined) {
      return <General {...generalSectionProps} />;
    } else return null;
  };

  const renderDataHandling = (): JSX.Element | null => {
    const dataHandlingProps: SectionProps = {
      requestSchemaValidation,
      disableAutomaticDecompression,
      readOnly: false,
      nodeId,
    };
    if (requestSchemaValidation !== undefined || disableAutomaticDecompression !== undefined) {
      return <DataHandling {...dataHandlingProps} />;
    } else return null;
  };

  const renderNetworking = (): JSX.Element | null => {
    const networkingProps: SectionProps = {
      readOnly: false,
      nodeId,
      retryPolicy,
      suppressWorkflowHeaders,
      suppressWorkflowHeadersOnResponse,
      paging,
      uploadChunk,
      downloadChunkSize,
      asynchronous,
      disableAsyncPattern,
      requestOptions,
    };

    return <Networking {...networkingProps} />;
  };

  const renderRunAfter = (): JSX.Element | null => {
    const runAfterProps: SectionProps = {
      readOnly: false,
      nodeId,
      graphEdges,
    };
    return <RunAfter allEdges={allEdges} {...runAfterProps} />;
  };

  const renderSecurity = (): JSX.Element | null => {
    const securitySectionProps: SectionProps = {
      secureInputs,
      secureOutputs,
      readOnly: false,
      nodeId,
    };
    return <Security {...securitySectionProps} />;
  };

  const renderTracking = (): JSX.Element | null => {
    const trackingProps: SectionProps = {
      readOnly: false,
      nodeId,
      trackedProperties,
      correlation, //correlation setting contains trackingId setting being used in this component
    };

    return <Tracking {...trackingProps} />;
  };

  const renderAllSettingsSections = (): JSX.Element => {
    return (
      <>
        {renderDataHandling()}
        {renderGeneral()}
        {renderNetworking()}
        {renderRunAfter()}
        {renderSecurity()}
        {renderTracking()}
      </>
    );
  };

  return renderAllSettingsSections();
};

const GetEdgeInfo = (id: string): runAfterConfigs => {
  const operationInfo = useOperationInfo(id);
  const iconUri = useIconUri(operationInfo);
  return { icon: iconUri, title: id };
};
