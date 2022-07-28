import constants from '../../common/constants';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import type { WorkflowEdge } from '../../core/parsers/models/workflowNode';
import { updateNodeSettings } from '../../core/state/operationMetadataSlice';
import { useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
import { setExpandedSections } from '../../core/state/settingSlice';
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

  const expandedSections = useSelector((state: RootState) => {
    return state.settings.expandedSections;
  });

  const dispatch = useDispatch();
  // const [ expandedSections, setExpandedSections ] = useState([] as SectionNames[]);

  // TODO: 14714481 We need to support all incoming edges (currently using all edges) and runAfterConfigMenu
  const allEdges: WorkflowEdge[] = useEdgesByParent();

  const GeneralSettings = (): JSX.Element | null => {
    const onConcurrencyToggle = (checked: boolean): void => {
      // TODO (14427339): Setting Validation
      dispatch(
        updateNodeSettings({
          id: nodeId,
          settings: {
            concurrency: {
              isSupported: true,
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
              isSupported: true,
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
      onHeaderClick: handleSectionClick,
      expanded: expandedSections.includes(constants.SETTINGSECTIONS.GENERAL),
    };
    if (splitOn?.isSupported || timeout?.isSupported || concurrency?.isSupported || conditionExpressions?.isSupported) {
      return <General {...generalSectionProps} />;
    } else return null;
  };

  const DataHandlingSettings = (): JSX.Element | null => {
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
      onHeaderClick: handleSectionClick,
      nodeId,
      onAutomaticDecompressionChange,
      onSchemaValidationChange,
    };
    if (requestSchemaValidation?.isSupported || disableAutomaticDecompression?.isSupported) {
      return <DataHandling {...dataHandlingProps} />;
    } else return null;
  };

  const NetworkingSettings = (): JSX.Element | null => {
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
      onHeaderClick: handleSectionClick,
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
  };

  const RunAfterSettings = (): JSX.Element | null => {
    const runAfterProps: SectionProps = {
      readOnly: false,
      nodeId,
      runAfter,
      expanded: expandedSections.includes(constants.SETTINGSECTIONS.RUNAFTER),
      onHeaderClick: handleSectionClick,
    };
    return runAfter?.isSupported ? <RunAfter allEdges={allEdges} {...runAfterProps} /> : null;
  };

  const SecuritySettings = (): JSX.Element | null => {
    const onSecureInputsChange = (checked: boolean): void => {
      // TODO (14427339): Setting Validation
      dispatch(
        updateNodeSettings({
          id: nodeId,
          settings: {
            secureInputs: { isSupported: true, value: checked },
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
            secureOutputs: { isSupported: true, value: checked },
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
      onHeaderClick: handleSectionClick,
    };
    return secureInputs?.isSupported || secureOutputs?.isSupported ? <Security {...securitySectionProps} /> : null;
  };

  const TrackingSettings = (): JSX.Element | null => {
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
      onHeaderClick: handleSectionClick,
      nodeId,
      onClientTrackingIdChange,
      onTrackedPropertiesDictionaryValueChanged,
      onTrackedPropertiesStringValueChange,
    };
    if (trackedProperties?.isSupported || correlation?.isSupported) {
      return <Tracking {...trackingProps} />;
    } else return null;
  };

  const handleSectionClick = (sectionName: string): void => {
    dispatch(setExpandedSections(sectionName));
  };

  const renderAllSettingsSections = (): JSX.Element => {
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

  return renderAllSettingsSections();
};
