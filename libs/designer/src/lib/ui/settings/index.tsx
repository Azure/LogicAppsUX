// this should have all settings sections together in one place
// later on will include the logic to render certain settings and/or sections
// for now should show and export:
// <General>
// <Run After>
// <Networking>
// <Data Handling>
// <Security>
// <Tracking>
import type { RootState } from '../../core/store';
import { DataHandling } from './sections/datahandling';
import { General } from './sections/general';
import { Security } from './sections/security';
import { stat } from 'fs/promises';
import { useSelector } from 'react-redux';

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
    splitOnConfiguration,
    paging,
    downloadChunkSize,
    concurrency,
    conditionExpressions,
    correlation,
  } = useSelector((state: RootState) => {
    return state.operations.settings[nodeId];
  });
  const securitySectionProps = {
    secureInputs,
    secureOutputs,
  };
  const generalSectionProps = {
    splitOn,
    timeout,
    concurrency,
    conditionExpressions,
  };
  const dataHandlingProps = {
    requestSchemaValidation,
    disableAutomaticDecompression,
  };

  return (
    <>
      <DataHandling {...dataHandlingProps} />
      <General {...generalSectionProps} />
      <Security {...securitySectionProps} />
    </>
  );
};
