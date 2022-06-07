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

  const renderGeneral = (): JSX.Element | null => {
    const generalSectionProps: SectionProps = {
      splitOn,
      timeout,
      concurrency,
      conditionExpressions,
      readOnly,
      nodeId,
    };
    if (splitOn !== undefined || timeout !== undefined || concurrency !== undefined || conditionExpressions !== undefined) {
      return <General {...generalSectionProps} />;
    } else return null;
  };

  const renderSecurity = (): JSX.Element | null => {
    const securitySectionProps: SectionProps = {
      secureInputs,
      secureOutputs,
      readOnly,
      nodeId,
    };
    if (secureInputs !== undefined || secureOutputs !== undefined) {
      return <Security {...securitySectionProps} />;
    } else return null;
  };

  const renderDataHandling = (): JSX.Element | null => {
    const dataHandlingProps: SectionProps = {
      requestSchemaValidation,
      disableAutomaticDecompression,
      readOnly,
      nodeId,
    };
    if (requestSchemaValidation !== undefined || disableAutomaticDecompression !== undefined) {
      return <DataHandling {...dataHandlingProps} />;
    } else return null;
  };

  const renderAllSettingsSections = (): JSX.Element => {
    return (
      <>
        {renderDataHandling()}
        {renderGeneral()}
        {renderSecurity()}
      </>
    );
  };

  return renderAllSettingsSections();
};
