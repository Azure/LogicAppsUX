import constants from '../../common/constants';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import type { WorkflowEdge } from '../../core/parsers/models/workflowNode';
import { useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import type { RootState } from '../../core/store';
import { DataHandling } from './sections/datahandling';
import type { DataHandlingSectionProps } from './sections/datahandling';
import { General } from './sections/general';
import type { GeneralSectionProps } from './sections/general';
import { Networking } from './sections/networking';
import type { NetworkingSectionProps } from './sections/networking';
import { RunAfter } from './sections/runafter';
import { Security } from './sections/security';
import type { SecuritySectionProps } from './sections/security';
import { Tracking } from './sections/tracking';
import type { TrackingSectionProps } from './sections/tracking';
import type { IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { equals, isObject } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useSelector } from 'react-redux';

export type ToggleHandler = (checked: boolean) => void;
export type TextChangeHandler = (newVal: string) => void;
export type NumberChangeHandler = (newVal: number) => void;

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
    splitOnConfiguration,
    paging,
    downloadChunkSize,
    concurrency,
    conditionExpressions,
    correlation,
    runAfter,
  } = useSelector((state: RootState) => {
    return state.operations.settings[nodeId] ?? {};
  });

  const defaultState = {
    isSupported: false,
  };

  const [concurrencyFromState, setConcurrency] = useState(concurrency ?? { ...defaultState, value: { enabled: false, value: undefined } });
  const [splitOnFromState, setSplitOn] = useState(splitOn ?? { ...defaultState, value: { enabled: false, value: undefined } });
  const [conditionExpressionsFromState, setConditionExpressions] = useState(conditionExpressions ?? { ...defaultState, value: undefined });
  const [timeoutFromState, setTimeout] = useState(timeout ?? { ...defaultState, value: undefined });
  const [splitOnConfigurationFromState, setSplitOnConfiguration] = useState(
    splitOnConfiguration ?? { correlation: { clientTrackingId: '' } }
  );
  const [automaticDecompression, setAutomaticDecompression] = useState(
    disableAutomaticDecompression ?? { ...defaultState, value: undefined }
  );
  const [schemaValidation, setSchemaValidation] = useState(requestSchemaValidation ?? { ...defaultState, value: undefined });
  const [disableAsyncPatternFromState, setDisableAsyncPattern] = useState(disableAsyncPattern ?? { ...defaultState, value: undefined });
  const [asyncResponseFromState, setAsyncResponse] = useState(asynchronous ?? { ...defaultState, value: undefined });
  const [pagingFromState, setPaging] = useState(paging ?? { ...defaultState, value: { enabled: false, value: undefined } });
  const [requestOptionsFromState, setRequestOptions] = useState(requestOptions ?? { ...defaultState, value: { timeout: undefined } });
  const [suppressWorkflowHeadersFromState, setSuppressWorkflowHeaders] = useState(
    suppressWorkflowHeaders ?? { ...defaultState, value: undefined }
  );
  const [workflowHeadersOnResponseFromState, setWorkflowHeadersOnResponse] = useState(
    suppressWorkflowHeadersOnResponse ?? { ...defaultState, value: undefined }
  );
  const [chunkedTransferModeFromState, setChunkedTransferMode] = useBoolean(
    equals(uploadChunk?.value?.transferMode, constants.SETTINGS.TRANSFER_MODE.CHUNKED)
  );
  const [secureInputsFromState, setSecureInputs] = useState(secureInputs ?? { ...defaultState, value: false });
  const [secureOutputsFromState, setSecureOutputs] = useState(secureOutputs ?? { ...defaultState, value: undefined });
  const [correlationFromState, setCorrelation] = useState(correlation ?? { ...defaultState, value: { clientTrackingId: undefined } });
  const [trackedPropertiesFromState, setTrackedProperties] = useState(trackedProperties ?? { ...defaultState, value: undefined });
  // TODO: 14714481 We need to support all incoming edges (currently using all edges) and runAfterConfigMenu
  const allEdges: WorkflowEdge[] = useEdgesByParent();

  const renderGeneral = (): JSX.Element | null => {
    const onConcurrencyToggle = (checked: boolean): void => {
      setConcurrency({ ...concurrencyFromState, value: { ...concurrencyFromState.value, enabled: checked } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onConcurrencyValueChange = (value: number): void => {
      setConcurrency({ ...concurrencyFromState, value: { enabled: concurrencyFromState.value?.enabled ?? true, value } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSplitOnToggle = (checked: boolean): void => {
      setSplitOn({ ...splitOnFromState, value: { ...splitOnFromState.value, enabled: checked } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTimeoutValueChange = (newVal: string): void => {
      setTimeout({ ...timeoutFromState, value: newVal });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTriggerConditionsChange = (newExpressions: string[]): void => {
      setConditionExpressions({ ...conditionExpressionsFromState, value: newExpressions });
    };

    const onClientTrackingIdChange = (newVal: string): void => {
      setSplitOnConfiguration({ correlation: { clientTrackingId: newVal } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSplitOnSelectionChanged = (selectedOption: IDropdownOption): void => {
      setSplitOn({
        ...splitOnFromState,
        value: { enabled: splitOnFromState.value?.enabled ?? true, value: selectedOption.key.toString() },
      });
    };

    const generalSectionProps: GeneralSectionProps = {
      splitOn: splitOnFromState,
      timeout: timeoutFromState,
      concurrency: concurrencyFromState,
      conditionExpressions: conditionExpressionsFromState,
      readOnly: false,
      nodeId,
      splitOnConfiguration: splitOnConfigurationFromState,
      onConcurrencyToggle,
      onConcurrencyValueChange,
      onSplitOnToggle,
      onSplitOnSelectionChanged,
      onTimeoutValueChange,
      onTriggerConditionsChange,
      onClientTrackingIdChange,
    };
    if (splitOn?.isSupported || timeout?.isSupported || concurrency?.isSupported || conditionExpressions?.isSupported) {
      return <General {...generalSectionProps} />;
    } else return null;
  };

  const renderDataHandling = (): JSX.Element | null => {
    const onAutomaticDecompressionChange = (checked: boolean): void => {
      setAutomaticDecompression({ ...automaticDecompression, value: checked });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };
    const onSchemaValidationChange = (checked: boolean): void => {
      setSchemaValidation({ ...schemaValidation, value: checked });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const dataHandlingProps: DataHandlingSectionProps = {
      requestSchemaValidation: schemaValidation,
      disableAutomaticDecompression: automaticDecompression,
      readOnly: false,
      nodeId,
      onAutomaticDecompressionChange,
      onSchemaValidationChange,
    };
    if (requestSchemaValidation?.isSupported || disableAutomaticDecompression?.isSupported) {
      return <DataHandling {...dataHandlingProps} />;
    } else return null;
  };

  const renderNetworking = (): JSX.Element | null => {
    const onAsyncPatternToggle = (checked: boolean): void => {
      setDisableAsyncPattern({ ...disableAsyncPatternFromState, value: checked });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onAsyncResponseToggle = (checked: boolean): void => {
      setAsyncResponse({ ...asyncResponseFromState, value: checked });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onRequestOptionsChange = (newVal: string): void => {
      setRequestOptions({ ...requestOptionsFromState, value: { timeout: newVal } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSuppressHeadersToggle = (checked: boolean): void => {
      setSuppressWorkflowHeaders({ ...suppressWorkflowHeadersFromState, value: checked });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onPaginationValueChange = (newVal: string): void => {
      setPaging({ ...pagingFromState, value: { enabled: !!pagingFromState.value?.enabled, value: Number(newVal) } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onHeadersOnResponseToggle = (checked: boolean): void => {
      setWorkflowHeadersOnResponse({ ...workflowHeadersOnResponseFromState, value: checked });
    };

    const onContentTransferToggle = (): void => {
      setChunkedTransferMode.toggle();
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const networkingProps: NetworkingSectionProps = {
      readOnly: false,
      nodeId,
      retryPolicy,
      suppressWorkflowHeaders: suppressWorkflowHeadersFromState,
      suppressWorkflowHeadersOnResponse: workflowHeadersOnResponseFromState,
      paging: pagingFromState,
      uploadChunk,
      downloadChunkSize,
      asynchronous: asyncResponseFromState,
      disableAsyncPattern: disableAsyncPattern,
      requestOptions: requestOptionsFromState,
      onAsyncPatternToggle,
      onAsyncResponseToggle,
      onContentTransferToggle,
      onPaginationValueChange,
      onRequestOptionsChange,
      onHeadersOnResponseToggle,
      chunkedTransferMode: chunkedTransferModeFromState,
      onSuppressHeadersToggle,
    };
    if (
      retryPolicy?.isSupported ||
      suppressWorkflowHeaders?.isSupported ||
      suppressWorkflowHeadersOnResponse?.isSupported ||
      paging?.isSupported ||
      uploadChunk?.isSupported ||
      downloadChunkSize?.isSupported ||
      asynchronous?.isSupported ||
      disableAsyncPattern?.isSupported ||
      requestOptions?.isSupported
    ) {
      return <Networking {...networkingProps} />;
    } else return null;
  };

  const renderRunAfter = (): JSX.Element | null => {
    const runAfterProps: SectionProps = {
      readOnly: false,
      nodeId,
      runAfter,
    };
    return runAfter?.isSupported ? <RunAfter allEdges={allEdges} {...runAfterProps} /> : null;
  };

  const renderSecurity = (): JSX.Element | null => {
    const onSecureInputsChange = (checked: boolean): void => {
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
      setSecureInputs({ ...secureInputsFromState, value: checked });
    };

    const onSecureOutputsChange = (checked: boolean): void => {
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
      setSecureOutputs({ ...secureOutputsFromState, value: checked });
    };

    const securitySectionProps: SecuritySectionProps = {
      secureInputs,
      secureOutputs,
      readOnly: false,
      nodeId,
      onSecureInputsChange,
      onSecureOutputsChange,
    };
    return secureInputs?.isSupported || secureOutputs?.isSupported ? <Security {...securitySectionProps} /> : null;
  };

  const renderTracking = (): JSX.Element | null => {
    const onClientTrackingIdChange = (newValue: string): void => {
      setCorrelation({ ...correlationFromState, value: { clientTrackingId: newValue } });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
      let trackedProperties: Record<string, any> = {}; // tslint:disable-line: no-any
      console.log(isObject([]));
      if (isObject(newValue) && Object.keys(newValue).length > 0 && Object.keys(newValue).some((key) => newValue[key] !== undefined)) {
        trackedProperties = {};
        for (const key of Object.keys(newValue)) {
          let propertyValue: any; // tslint:disable-line: no-any
          try {
            propertyValue = JSON.parse(newValue[key]);
          } catch {
            propertyValue = newValue[key];
          }

          trackedProperties[key] = propertyValue;
        }
      }
      setTrackedProperties({ ...trackedPropertiesFromState, value: trackedProperties });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTrackedPropertiesStringValueChange = (newValue: string): void => {
      let trackedProperties: any = ''; // tslint:disable-line: no-any
      if (newValue) {
        try {
          trackedProperties = JSON.parse(newValue);
        } catch {
          trackedProperties = newValue;
        }
      }
      setTrackedProperties({ ...trackedPropertiesFromState, value: trackedProperties });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const trackingProps: TrackingSectionProps = {
      readOnly: false,
      nodeId,
      trackedProperties,
      correlation,
      onClientTrackingIdChange,
      onTrackedPropertiesDictionaryValueChanged,
      onTrackedPropertiesStringValueChange,
    };
    if (trackedProperties?.isSupported || correlation?.isSupported) {
      return <Tracking {...trackingProps} />;
    } else return null;
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
