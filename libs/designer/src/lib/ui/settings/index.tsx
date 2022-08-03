import constants from '../../common/constants';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import type { WorkflowEdge } from '../../core/parsers/models/workflowNode';
import { updateNodeSettings } from '../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../core/state/panel/panelSelectors';
import { setExpandedSections } from '../../core/state/settingSlice';
import { useEdgesBySource } from '../../core/state/workflow/workflowSelectors';
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
import { useDispatch, useSelector } from 'react-redux';

export type ToggleHandler = (checked: boolean) => void;
export type TextChangeHandler = (newVal: string) => void;
export type NumberChangeHandler = (newVal: number) => void;

export interface SectionProps extends Settings {
  readOnly: boolean | undefined;
  nodeId: string;
  expanded: boolean;
  onHeaderClick?: HeaderClickHandler;
}

export type HeaderClickHandler = (sectionName: string) => void;

export const SettingsPanel = (): JSX.Element => {
  return (
    <>
      <DataHandlingSettings />
      <GeneralSettings />
      <NetworkingSettings />
      <RunAfterSettings />
      <SecuritySettings />
      <TrackingSettings />
    </>
  );
};

function GeneralSettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    { timeout, splitOn, splitOnConfiguration, concurrency, conditionExpressions } = useSelector(
      (state: RootState) => state.operations.settings[nodeId] ?? {}
    );

  const onConcurrencyToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          concurrency: {
            isSupported: !!concurrency?.isSupported,
            value: { value: concurrency?.value?.value ?? undefined, enabled: checked },
          },
        },
      })
    );
  };

  const onConcurrencyValueChange = (value: number): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          concurrency: {
            isSupported: !!concurrency?.isSupported,
            value: { enabled: true, value },
          },
        },
      })
    );
  };

  const onSplitOnToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          splitOn: {
            isSupported: !!splitOn?.isSupported,
            value: {
              enabled: checked,
              value: splitOn?.value?.value ?? undefined,
            },
          },
        },
      })
    );
  };

  const onTimeoutValueChange = (newVal: string): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          timeout: {
            isSupported: !!timeout?.isSupported,
            value: newVal,
          },
        },
      })
    );
  };

  const onTriggerConditionsChange = (newExpressions: string[]): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          conditionExpressions: {
            isSupported: !!conditionExpressions?.isSupported,
            value: newExpressions,
          },
        },
      })
    );
  };

  const onClientTrackingIdChange = (newVal: string): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          splitOnConfiguration: {
            correlation: { clientTrackingId: newVal },
          },
        },
      })
    );
  };

  const onSplitOnSelectionChanged = (selectedOption: IDropdownOption): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          splitOn: {
            isSupported: !!splitOn?.isSupported,
            value: {
              enabled: splitOn?.value?.enabled ?? true,
              value: selectedOption.key.toString(),
            },
          },
        },
      })
    );
  };

  const generalSectionProps: GeneralSectionProps = {
    splitOn,
    timeout,
    concurrency,
    conditionExpressions,
    splitOnConfiguration,
    readOnly: false,
    nodeId,
    onConcurrencyToggle,
    onConcurrencyValueChange,
    onSplitOnToggle,
    onSplitOnSelectionChanged,
    onTimeoutValueChange,
    onTriggerConditionsChange,
    onClientTrackingIdChange,
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.GENERAL),
  };

  if (splitOn?.isSupported || timeout?.isSupported || concurrency?.isSupported || conditionExpressions?.isSupported) {
    return <General {...generalSectionProps} />;
  } else return null;
}

function TrackingSettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    { trackedProperties, correlation } = useSelector((state: RootState) => state.operations.settings[nodeId] ?? {});

  const onClientTrackingIdChange = (newValue: string): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          correlation: {
            isSupported: !!correlation?.isSupported,
            value: {
              clientTrackingId: newValue,
            },
          },
        },
      })
    );
  };

  const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
    let trackedPropertiesInput: Record<string, any> = {}; // tslint:disable-line: no-any
    if (isObject(newValue) && Object.keys(newValue).length > 0 && Object.keys(newValue).some((key) => newValue[key] !== undefined)) {
      trackedPropertiesInput = {};
      for (const key of Object.keys(newValue)) {
        let propertyValue: any; // tslint:disable-line: no-any
        try {
          propertyValue = JSON.parse(newValue[key]);
        } catch {
          propertyValue = newValue[key];
        }

        trackedPropertiesInput[key] = propertyValue;
      }
    }
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          trackedProperties: {
            isSupported: !!trackedProperties?.isSupported,
            value: trackedPropertiesInput,
          },
        },
      })
    );
  };

  const onTrackedPropertiesStringValueChange = (newValue: string): void => {
    let trackedPropertiesInput: any = ''; // tslint:disable-line: no-any
    if (newValue) {
      try {
        trackedPropertiesInput = JSON.parse(newValue);
      } catch {
        trackedPropertiesInput = newValue;
      }
    }
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          trackedProperties: {
            isSupported: !!trackedProperties?.isSupported,
            value: trackedPropertiesInput,
          },
        },
      })
    );
  };

  const trackingProps: TrackingSectionProps = {
    trackedProperties,
    correlation,
    readOnly: false,
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.TRACKING),
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
    nodeId,
    onClientTrackingIdChange,
    onTrackedPropertiesDictionaryValueChanged,
    onTrackedPropertiesStringValueChange,
  };

  if (trackedProperties?.isSupported || correlation?.isSupported) {
    return <Tracking {...trackingProps} />;
  } else return null;
}

function DataHandlingSettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    { disableAutomaticDecompression, requestSchemaValidation } = useSelector((state: RootState) => state.operations.settings[nodeId] ?? {});

  const onAutomaticDecompressionChange = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          disableAutomaticDecompression: {
            isSupported: !!disableAutomaticDecompression?.isSupported,
            value: checked,
          },
        },
      })
    );
  };
  const onSchemaValidationChange = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          requestSchemaValidation: {
            isSupported: !!requestSchemaValidation?.isSupported,
            value: checked,
          },
        },
      })
    );
  };

  const dataHandlingProps: DataHandlingSectionProps = {
    requestSchemaValidation,
    disableAutomaticDecompression,
    readOnly: false,
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.DATAHANDLING),
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
    nodeId,
    onAutomaticDecompressionChange,
    onSchemaValidationChange,
  };
  if (requestSchemaValidation?.isSupported || disableAutomaticDecompression?.isSupported) {
    return <DataHandling {...dataHandlingProps} />;
  } else return null;
}

function NetworkingSettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    {
      asynchronous,
      disableAsyncPattern,
      suppressWorkflowHeaders,
      suppressWorkflowHeadersOnResponse,
      requestOptions,
      retryPolicy,
      uploadChunk,
      paging,
      downloadChunkSize,
    } = useSelector((state: RootState) => state.operations.settings[nodeId] ?? {});

  const onAsyncPatternToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          disableAsyncPattern: {
            isSupported: !!disableAsyncPattern?.isSupported,
            value: checked,
          },
        },
      })
    );
  };

  const onAsyncResponseToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          asynchronous: {
            isSupported: !!asynchronous?.isSupported,
            value: checked,
          },
        },
      })
    );
  };

  const onRequestOptionsChange = (newVal: string): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          requestOptions: {
            isSupported: !!requestOptions?.isSupported,
            value: { timeout: newVal },
          },
        },
      })
    );
  };

  const onSuppressHeadersToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          suppressWorkflowHeaders: {
            isSupported: !!suppressWorkflowHeaders?.isSupported,
            value: checked,
          },
        },
      })
    );
  };

  const onPaginationValueChange = (newVal: string): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          paging: {
            isSupported: !!paging?.isSupported,
            value: {
              enabled: !!paging?.value?.enabled,
              value: Number(newVal),
            },
          },
        },
      })
    );
  };

  const onHeadersOnResponseToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          suppressWorkflowHeadersOnResponse: {
            isSupported: !!suppressWorkflowHeadersOnResponse?.isSupported,
            value: checked,
          },
        },
      })
    );
  };

  const onContentTransferToggle = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          uploadChunk: {
            isSupported: !uploadChunk?.isSupported,
            value: {
              ...uploadChunk?.value,
              transferMode: checked ? constants.SETTINGS.TRANSFER_MODE.CHUNKED : undefined,
            },
          },
        },
      })
    );
  };

  const networkingProps: NetworkingSectionProps = {
    suppressWorkflowHeaders,
    suppressWorkflowHeadersOnResponse,
    paging,
    asynchronous,
    readOnly: false,
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.NETWORKING),
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
    requestOptions,
    disableAsyncPattern,
    chunkedTransferMode: equals(uploadChunk?.value?.transferMode, constants.SETTINGS.TRANSFER_MODE.CHUNKED),
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
}

function RunAfterSettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    { runAfter } = useSelector((state: RootState) => state.operations.settings[nodeId] ?? {});

  // TODO: 14714481 We need to support all incoming edges (currently using all edges) and runAfterConfigMenu
  const allEdges: WorkflowEdge[] = useEdgesBySource();
  const runAfterProps: SectionProps = {
    readOnly: false,
    nodeId,
    runAfter,
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.RUNAFTER),
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
  };

  return runAfter?.isSupported ? <RunAfter allEdges={allEdges} {...runAfterProps} /> : null;
}

function SecuritySettings(): JSX.Element | null {
  const dispatch = useDispatch();
  const expandedSections = useSelector((state: RootState) => state.settings.expandedSections),
    nodeId = useSelectedNodeId(),
    { secureInputs, secureOutputs } = useSelector((state: RootState) => state.operations.settings[nodeId] ?? {});
  const onSecureInputsChange = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          secureInputs: { isSupported: !!secureInputs?.isSupported, value: checked },
        },
      })
    );
  };

  const onSecureOutputsChange = (checked: boolean): void => {
    // TODO (14427339): Setting Validation
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          secureOutputs: { isSupported: !!secureOutputs?.isSupported, value: checked },
        },
      })
    );
  };

  const securitySectionProps: SecuritySectionProps = {
    secureInputs,
    secureOutputs,
    readOnly: false,
    nodeId,
    onSecureInputsChange,
    onSecureOutputsChange,
    expanded: expandedSections.includes(constants.SETTINGSECTIONS.SECURITY),
    onHeaderClick: (sectionName) => dispatch(setExpandedSections(sectionName)),
  };

  return secureInputs?.isSupported || secureOutputs?.isSupported ? <Security {...securitySectionProps} /> : null;
}
