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

  const [settingsFromState, updateSettings] = useState({
    concurrency: concurrency ?? { ...defaultState, value: { enabled: false, value: undefined } },
    splitOn: splitOn ?? { ...defaultState, value: { enabled: false, value: undefined } },
    conditionExpressions: conditionExpressions ?? { ...defaultState, value: undefined },
    timeout: timeout ?? { ...defaultState, value: undefined },
    splitOnConfiguration: splitOnConfiguration ?? { correlation: { clientTrackingId: '' } },
    disableAutomaticDecompression: disableAutomaticDecompression ?? { ...defaultState, value: undefined },
    requestSchemaValidation: requestSchemaValidation ?? { ...defaultState, value: undefined },
    disableAsyncPattern: disableAsyncPattern ?? { ...defaultState, value: undefined },
    asynchronous: asynchronous ?? { ...defaultState, value: undefined },
    paging: paging ?? { ...defaultState, value: { enabled: false, value: undefined } },
    requestOptions: requestOptions ?? { ...defaultState, value: { timeout: undefined } },
    suppressWorkflowHeaders: suppressWorkflowHeaders ?? { ...defaultState, value: undefined },
    suppressWorkflowHeadersOnResponse: suppressWorkflowHeadersOnResponse ?? { ...defaultState, value: undefined },
    chunkedTransferMode: equals(uploadChunk?.value?.transferMode, constants.SETTINGS.TRANSFER_MODE.CHUNKED),
    secureInputs: secureInputs ?? { ...defaultState, value: false },
    secureOutputs: secureOutputs ?? { ...defaultState, value: undefined },
    correlation: correlation ?? { ...defaultState, value: { clientTrackingId: undefined } },
    trackedProperties: trackedProperties ?? { ...defaultState, value: undefined },
  });

  // TODO: 14714481 We need to support all incoming edges (currently using all edges) and runAfterConfigMenu
  const allEdges: WorkflowEdge[] = useEdgesByParent();

  const renderGeneral = (): JSX.Element | null => {
    const {
      concurrency: concurrencyFromState,
      splitOn: splitOnFromState,
      timeout: timeoutFromState,
      conditionExpressions: conditionExpressionsFromState,
      splitOnConfiguration: splitOnConfigurationFromState,
    } = settingsFromState;
    const onConcurrencyToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        concurrency: {
          ...concurrencyFromState,
          value: { ...concurrencyFromState.value, enabled: checked },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onConcurrencyValueChange = (value: number): void => {
      updateSettings({
        ...settingsFromState,
        concurrency: {
          ...concurrencyFromState,
          value: {
            enabled: concurrencyFromState.value?.enabled ?? true,
            value,
          },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSplitOnToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        splitOn: {
          ...splitOnFromState,
          value: {
            ...splitOnFromState.value,
            enabled: checked,
          },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTimeoutValueChange = (newVal: string): void => {
      updateSettings({
        ...settingsFromState,
        timeout: {
          ...timeoutFromState,
          value: newVal,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTriggerConditionsChange = (newExpressions: string[]): void => {
      updateSettings({
        ...settingsFromState,
        conditionExpressions: {
          ...conditionExpressionsFromState,
          value: newExpressions,
        },
      });
    };

    const onClientTrackingIdChange = (newVal: string): void => {
      updateSettings({
        ...settingsFromState,
        splitOnConfiguration: {
          correlation: { clientTrackingId: newVal },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSplitOnSelectionChanged = (selectedOption: IDropdownOption): void => {
      updateSettings({
        ...settingsFromState,
        splitOn: {
          ...splitOnFromState,
          value: {
            enabled: splitOnFromState.value?.enabled ?? true,
            value: selectedOption.key.toString(),
          },
        },
      });
    };

    const generalSectionProps: GeneralSectionProps = {
      splitOn: splitOnFromState,
      timeout: timeoutFromState,
      concurrency: concurrencyFromState,
      conditionExpressions: conditionExpressionsFromState,
      splitOnConfiguration: splitOnConfigurationFromState,
      readOnly: false,
      nodeId,
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
    const {
      disableAutomaticDecompression: disableAutomaticDecompressionFromState,
      requestSchemaValidation: requestSchemaValidationFromState,
    } = settingsFromState;
    const onAutomaticDecompressionChange = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        disableAutomaticDecompression: {
          ...disableAutomaticDecompressionFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };
    const onSchemaValidationChange = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        requestSchemaValidation: {
          ...requestSchemaValidationFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const dataHandlingProps: DataHandlingSectionProps = {
      requestSchemaValidation: requestSchemaValidationFromState,
      disableAutomaticDecompression: disableAutomaticDecompressionFromState,
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
    const {
      disableAsyncPattern: disableAsyncPatternFromState,
      asynchronous: asynchronousFromState,
      requestOptions: requestOptionsFromState,
      suppressWorkflowHeaders: suppressWorkflowHeadersFromState,
      paging: pagingFromState,
      suppressWorkflowHeadersOnResponse: suppressHeadersOnResponseFromState,
      chunkedTransferMode: chunkedTransferModeFromState,
    } = settingsFromState;
    const onAsyncPatternToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        disableAsyncPattern: {
          ...disableAsyncPatternFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onAsyncResponseToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        asynchronous: {
          ...asynchronousFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onRequestOptionsChange = (newVal: string): void => {
      updateSettings({
        ...settingsFromState,
        requestOptions: {
          ...requestOptionsFromState,
          value: { timeout: newVal },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSuppressHeadersToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        suppressWorkflowHeaders: {
          ...suppressWorkflowHeadersFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onPaginationValueChange = (newVal: string): void => {
      updateSettings({
        ...settingsFromState,
        paging: {
          ...pagingFromState,
          value: {
            enabled: !!pagingFromState.value?.enabled,
            value: Number(newVal),
          },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onHeadersOnResponseToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        suppressWorkflowHeadersOnResponse: {
          ...suppressHeadersOnResponseFromState,
          value: checked,
        },
      });
    };

    const onContentTransferToggle = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        chunkedTransferMode: checked,
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const networkingProps: NetworkingSectionProps = {
      suppressWorkflowHeaders: suppressWorkflowHeadersFromState,
      suppressWorkflowHeadersOnResponse: suppressHeadersOnResponseFromState,
      paging: pagingFromState,
      asynchronous: asynchronousFromState,
      readOnly: false,
      requestOptions: requestOptionsFromState,
      disableAsyncPattern: disableAsyncPatternFromState,
      chunkedTransferMode: chunkedTransferModeFromState,
      nodeId,
      retryPolicy,
      uploadChunk,
      downloadChunkSize,
      onAsyncPatternToggle,
      onAsyncResponseToggle,
      onContentTransferToggle,
      onPaginationValueChange,
      onRequestOptionsChange,
      onHeadersOnResponseToggle,
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
    const { secureInputs: secureInputsFromState, secureOutputs: secureOutputsFromState } = settingsFromState;
    const onSecureInputsChange = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        secureInputs: {
          ...secureInputsFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onSecureOutputsChange = (checked: boolean): void => {
      updateSettings({
        ...settingsFromState,
        secureOutputs: {
          ...secureOutputsFromState,
          value: checked,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const securitySectionProps: SecuritySectionProps = {
      secureInputs: secureInputsFromState,
      secureOutputs: secureOutputsFromState,
      readOnly: false,
      nodeId,
      onSecureInputsChange,
      onSecureOutputsChange,
    };
    return secureInputs?.isSupported || secureOutputs?.isSupported ? <Security {...securitySectionProps} /> : null;
  };

  const renderTracking = (): JSX.Element | null => {
    const { correlation: correlationFromState, trackedProperties: trackedPropertiesFromState } = settingsFromState;
    const onClientTrackingIdChange = (newValue: string): void => {
      updateSettings({
        ...settingsFromState,
        correlation: {
          ...correlationFromState,
          value: {
            clientTrackingId: newValue,
          },
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
      let trackedProperties: Record<string, any> = {}; // tslint:disable-line: no-any
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
      updateSettings({
        ...settingsFromState,
        trackedProperties: {
          ...trackedPropertiesFromState,
          value: trackedProperties,
        },
      });
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
      updateSettings({
        ...settingsFromState,
        trackedProperties: {
          ...trackedPropertiesFromState,
          value: trackedProperties,
        },
      });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const trackingProps: TrackingSectionProps = {
      trackedProperties: trackedPropertiesFromState,
      correlation: correlationFromState,
      readOnly: false,
      nodeId,
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
