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
import { Networking } from './sections/networking';
import { Security } from './sections/security';
import { Tracking } from './sections/tracking';
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
    // splitOnConfiguration,
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
    return <Security {...securitySectionProps} />;
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

  const renderNetworking = (): JSX.Element | null => {
    const networkingProps: SectionProps = {
      readOnly,
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

  const renderTracking = (): JSX.Element | null => {
    const trackingProps: SectionProps = {
      readOnly,
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
        {/* {renderRunAfter()} */}
        {renderSecurity()}
        {renderTracking()}
      </>
    );
  };

  return renderAllSettingsSections();
};
