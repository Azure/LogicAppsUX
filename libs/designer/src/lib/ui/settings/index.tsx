// this should have all settings sections together in one place
// later on will include the logic to render certain settings and/or sections
// for now should show and export:
// <General>
// <Run After>
// <Networking>
// <Data Handling>
// <Security>
// <Tracking>
import { ProviderWrappedContext } from '../../core';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import type { RootState } from '../../core/store';
import { DataHandling } from './sections/datahandling';
import { General } from './sections/general';
import { Security } from './sections/security';
import { useContext } from 'react';
import { useSelector } from 'react-redux';

export interface SectionProps extends Settings {
  readOnly: boolean | undefined;
  nodeId: string;
}

export const SettingsPanel = (): JSX.Element => {
  const nodeId = useSelector((state: RootState) => {
    return state.panel.selectedNode;
  });
  const { readOnly } = useContext(ProviderWrappedContext) ?? {};
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
  const securitySectionProps: SectionProps = {
    secureInputs,
    secureOutputs,
    readOnly,
    nodeId,
  };
  const generalSectionProps: SectionProps = {
    splitOn,
    timeout,
    concurrency,
    conditionExpressions,
    readOnly,
    nodeId,
  };
  const dataHandlingProps: SectionProps = {
    requestSchemaValidation,
    disableAutomaticDecompression,
    readOnly,
    nodeId,
  };

  return (
    <>
      <DataHandling {...dataHandlingProps} />
      <General {...generalSectionProps} />
      <Security {...securitySectionProps} />
    </>
  );
};
