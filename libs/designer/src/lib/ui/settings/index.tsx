import constants from '../../common/constants';
import { updateOutputsAndTokens } from '../../core/actions/bjsworkflow/initialize';
import type { Settings } from '../../core/actions/bjsworkflow/settings';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { updateNodeSettings } from '../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../core/state/panel/panelSelectors';
import { useExpandedSections } from '../../core/state/setting/settingSelector';
import { setExpandedSections } from '../../core/state/setting/settingSlice';
import { updateTokenSecureStatus } from '../../core/state/tokens/tokensSlice';
import type { AppDispatch, RootState } from '../../core/store';
import { isRootNodeInGraph } from '../../core/utils/graph';
import { isSecureOutputsLinkedToInputs } from '../../core/utils/setting';
import { DataHandling } from './sections/datahandling';
import { General } from './sections/general';
import { Networking } from './sections/networking';
import { RunAfter } from './sections/runafter';
import { Security } from './sections/security';
import { Tracking } from './sections/tracking';
import type { ValidationError } from './validation/validation';
import { ValidationErrorKeys, validateNodeSettings } from './validation/validation';
import type { IDropdownOption } from '@fluentui/react';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { equals, isObject } from '@microsoft/utils-logic-apps';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export type ToggleHandler = (checked: boolean) => void;
export type TextChangeHandler = (newVal: string) => void;
export type NumberChangeHandler = (newVal: number) => void;
export type DropdownSelectionChangeHandler = (selectedOption: IDropdownOption) => void;

export const SettingSectionName = {
  DATAHANDLING: 'datahandling',
  GENERAL: 'general',
  NETWORKING: 'networking',
  RUNAFTER: 'runafter',
  SECURITY: 'security',
  TRACKING: 'tracking',
} as const;
export type SettingSectionName = (typeof SettingSectionName)[keyof typeof SettingSectionName];

export interface SectionProps extends Settings {
  readOnly: boolean | undefined;
  nodeId: string;
  expanded: boolean;
  onHeaderClick?: HeaderClickHandler;
  validationErrors?: ValidationError[];
}

interface SettingSectionProps {
  nodeId: string;
  isExpanded: boolean;
  readOnly?: boolean;
  nodeSettings: Settings;
  validationErrors: ValidationError[];
  dispatch: AppDispatch;
  updateSettings: (settings: Settings, validateSetting?: boolean) => void;
  expandSettingSection: (sectionName: SettingSectionName) => void;
}

export type HeaderClickHandler = (sectionName: SettingSectionName) => void;

export const SettingsPanel = (): JSX.Element => {
  const dispatch = useDispatch();
  const selectedNode = useSelectedNodeId();
  const readOnly = useReadOnly();
  const expandedSections = useExpandedSections();

  const { nodeSettings, nodeSettingValidationErrors } = useSelector((state: RootState) => {
    return {
      nodeSettings: state.operations.settings?.[selectedNode] ?? {},
      nodeSettingValidationErrors: state.settings.validationErrors?.[selectedNode] ?? [],
    };
  });

  const handleUpdateSettings = (settings: Settings, settingSection: SettingSectionName, shouldValidateSetting?: boolean) => {
    dispatch(
      updateNodeSettings({
        id: selectedNode,
        settings,
      })
    );
    if (shouldValidateSetting) {
      validateNodeSettings(selectedNode, settings, settingSection, dispatch);
    }
  };

  const expandSettingSection = (sectionName: SettingSectionName): void => {
    dispatch(setExpandedSections(sectionName));
  };

  const getPropsBasedOnSection = (settingSection: SettingSectionName): { isExpanded: boolean; validationErrors: ValidationError[] } => {
    const validationErrors: ValidationError[] = [];
    switch (settingSection) {
      case SettingSectionName.GENERAL:
        validationErrors.push(
          ...nodeSettingValidationErrors.filter(({ key }) => {
            return (
              key === ValidationErrorKeys.TRIGGER_CONDITION_EMPTY ||
              key === ValidationErrorKeys.CHUNK_SIZE_INVALID ||
              key === ValidationErrorKeys.SINGLE_INSTANCE_SPLITON
            );
          })
        );
        break;
      case SettingSectionName.NETWORKING:
        validationErrors.push(
          ...nodeSettingValidationErrors.filter(({ key }) => {
            return (
              key === ValidationErrorKeys.PAGING_COUNT ||
              key === ValidationErrorKeys.RETRY_COUNT_INVALID ||
              key === ValidationErrorKeys.RETRY_INTERVAL_INVALID ||
              key === ValidationErrorKeys.TIMEOUT_VALUE_INVALID
            );
          })
        );
        break;
      default:
        break;
    }
    return { isExpanded: expandedSections.includes(settingSection), validationErrors };
  };

  const baseSettingProps = { nodeId: selectedNode, readOnly, nodeSettings, expandSettingSection, dispatch };

  return (
    <div key={`${selectedNode} settings`}>
      <DataHandlingSettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.DATAHANDLING, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.DATAHANDLING)}
      />
      <GeneralSettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.GENERAL, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.GENERAL)}
      />
      <NetworkingSettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.NETWORKING, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.NETWORKING)}
      />
      <RunAfterSettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.RUNAFTER, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.RUNAFTER)}
      />
      <SecuritySettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.SECURITY, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.SECURITY)}
      />
      <TrackingSettings
        {...baseSettingProps}
        updateSettings={(settings, validateSetting) => handleUpdateSettings(settings, SettingSectionName.TRACKING, validateSetting)}
        {...getPropsBasedOnSection(SettingSectionName.TRACKING)}
      />
    </div>
  );
};

function DataHandlingSettings({
  nodeId,
  readOnly,
  isExpanded,
  nodeSettings,
  updateSettings,
  expandSettingSection,
}: SettingSectionProps): JSX.Element {
  const { disableAutomaticDecompression, requestSchemaValidation } = nodeSettings;

  const onAutomaticDecompressionChange = (checked: boolean): void => {
    updateSettings({
      disableAutomaticDecompression: {
        isSupported: !!disableAutomaticDecompression?.isSupported,
        value: checked,
      },
    });
  };
  const onSchemaValidationChange = (checked: boolean): void => {
    updateSettings({
      requestSchemaValidation: {
        isSupported: !!requestSchemaValidation?.isSupported,
        value: checked,
      },
    });
  };

  return (
    <>
      {requestSchemaValidation?.isSupported || disableAutomaticDecompression?.isSupported ? (
        <DataHandling
          nodeId={nodeId}
          readOnly={readOnly}
          expanded={isExpanded}
          requestSchemaValidation={requestSchemaValidation}
          disableAutomaticDecompression={disableAutomaticDecompression}
          onHeaderClick={expandSettingSection}
          onAutomaticDecompressionChange={onAutomaticDecompressionChange}
          onSchemaValidationChange={onSchemaValidationChange}
        />
      ) : null}
    </>
  );
}

function GeneralSettings({
  nodeId,
  readOnly,
  nodeSettings,
  isExpanded,
  validationErrors,
  dispatch,
  updateSettings,
}: SettingSectionProps): JSX.Element | null {
  const { isTrigger, nodeInputs, operationInfo } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
      nodeInputs: state.operations.inputParameters[nodeId],
      operationInfo: state.operations.operationInfo[nodeId],
      operations: state.operations,
    };
  });

  const { timeout, splitOn, splitOnConfiguration, concurrency, conditionExpressions, invokerConnection } = useSelector(
    (state: RootState) => state.operations.settings?.[nodeId] ?? {}
  );

  const onConcurrencyToggle = (checked: boolean): void => {
    const value = checked ? concurrency?.value?.value ?? constants.CONCURRENCY_ACTION_SLIDER_LIMITS.DEFAULT : undefined;

    updateSettings({
      concurrency: {
        isSupported: !!concurrency?.isSupported,
        value: { value, enabled: checked },
      },
    });
  };

  const onConcurrencyValueChange = (value: number): void => {
    updateSettings({
      concurrency: {
        isSupported: !!concurrency?.isSupported,
        value: { enabled: true, value },
      },
    });
  };

  const onSplitOnToggle = (checked: boolean): void => {
    const splitOnSetting = {
      isSupported: !!splitOn?.isSupported,
      value: {
        enabled: checked,
        value: splitOn?.value?.value ?? undefined,
      },
    };

    updateSettings({ splitOn: splitOnSetting });
    updateOutputsAndTokens(nodeId, operationInfo, dispatch, isTrigger, nodeInputs, { ...nodeSettings, splitOn: splitOnSetting });
  };

  const onTimeoutValueChange = (newVal: string): void => {
    updateSettings({
      timeout: {
        isSupported: !!timeout?.isSupported,
        value: newVal,
      },
    });
  };

  const onTriggerConditionsChange = (newExpressions: string[]): void => {
    updateSettings(
      {
        conditionExpressions: {
          isSupported: !!conditionExpressions?.isSupported,
          value: newExpressions,
        },
      },
      true
    );
  };

  const onClientTrackingIdChange = (newVal: string): void => {
    updateSettings({
      splitOnConfiguration: {
        correlation: { clientTrackingId: newVal },
      },
    });
  };

  const onSplitOnSelectionChanged = (selectedOption: IDropdownOption): void => {
    const splitOnSetting = {
      isSupported: !!splitOn?.isSupported,
      value: {
        enabled: splitOn?.value?.enabled ?? true,
        value: selectedOption.key.toString(),
      },
    };

    updateSettings({ splitOn: splitOnSetting });
    updateOutputsAndTokens(nodeId, operationInfo, dispatch, isTrigger, nodeInputs, { ...nodeSettings, splitOn: splitOnSetting });
  };

  const onInvokerConnectionToggle = (checked: boolean): void => {
    dispatch(
      updateNodeSettings({
        id: nodeId,
        settings: {
          invokerConnection: {
            isSupported: !!invokerConnection?.isSupported,
            value: { value: invokerConnection?.value?.value, enabled: checked },
          },
        },
      })
    );
  };

  if (
    splitOn?.isSupported ||
    timeout?.isSupported ||
    concurrency?.isSupported ||
    conditionExpressions?.isSupported ||
    invokerConnection?.isSupported
  ) {
    return (
      <General
        nodeId={nodeId}
        readOnly={readOnly}
        expanded={isExpanded}
        validationErrors={validationErrors}
        splitOn={splitOn}
        timeout={timeout}
        concurrency={concurrency}
        invokerConnection={invokerConnection}
        conditionExpressions={conditionExpressions}
        splitOnConfiguration={splitOnConfiguration}
        onHeaderClick={(sectionName) => dispatch(setExpandedSections(sectionName))}
        onConcurrencyToggle={onConcurrencyToggle}
        onConcurrencyValueChange={onConcurrencyValueChange}
        onInvokerConnectionToggle={onInvokerConnectionToggle}
        onSplitOnToggle={onSplitOnToggle}
        onSplitOnSelectionChanged={onSplitOnSelectionChanged}
        onTimeoutValueChange={onTimeoutValueChange}
        onTriggerConditionsChange={onTriggerConditionsChange}
        onClientTrackingIdChange={onClientTrackingIdChange}
      />
    );
  } else return null;
}

function NetworkingSettings({
  nodeId,
  readOnly,
  nodeSettings,
  isExpanded,
  validationErrors,
  updateSettings,
  dispatch,
}: SettingSectionProps): JSX.Element | null {
  const {
    asynchronous,
    disableAsyncPattern,
    suppressWorkflowHeaders,
    suppressWorkflowHeadersOnResponse,
    requestOptions,
    retryPolicy,
    uploadChunk,
    paging,
    downloadChunkSize,
  } = nodeSettings;

  const onAsyncPatternToggle = (checked: boolean): void => {
    updateSettings({
      disableAsyncPattern: {
        isSupported: !!disableAsyncPattern?.isSupported,
        value: checked,
      },
    });
  };

  const onAsyncResponseToggle = (checked: boolean): void => {
    updateSettings({
      asynchronous: {
        isSupported: !!asynchronous?.isSupported,
        value: checked,
      },
    });
  };

  const onRequestOptionsChange = (newVal: string): void => {
    updateSettings(
      {
        requestOptions: {
          isSupported: !!requestOptions?.isSupported,
          value: { timeout: newVal },
        },
      },
      true
    );
  };

  const onSuppressHeadersToggle = (checked: boolean): void => {
    updateSettings({
      suppressWorkflowHeaders: {
        isSupported: !!suppressWorkflowHeaders?.isSupported,
        value: checked,
      },
    });
  };

  const onPaginationToggle = (checked: boolean): void => {
    updateSettings(
      {
        paging: {
          isSupported: !!paging?.isSupported,
          value: { ...paging?.value, enabled: checked },
        },
      },
      true
    );
  };

  const onPaginationValueChange = (newVal: string): void => {
    updateSettings(
      {
        paging: {
          isSupported: !!paging?.isSupported,
          value: {
            enabled: !!paging?.value?.enabled,
            value: Number(newVal),
          },
        },
      },
      true
    );
  };

  const onHeadersOnResponseToggle = (checked: boolean): void => {
    updateSettings({
      suppressWorkflowHeadersOnResponse: {
        isSupported: !!suppressWorkflowHeadersOnResponse?.isSupported,
        value: checked,
      },
    });
  };

  const onContentTransferToggle = (checked: boolean): void => {
    updateSettings({
      uploadChunk: {
        isSupported: !!uploadChunk?.isSupported,
        value: {
          ...uploadChunk?.value,
          transferMode: checked ? constants.SETTINGS.TRANSFER_MODE.CHUNKED : undefined,
        },
      },
    });
  };

  const onRetryPolicyChange = (selectedOption: IDropdownOption): void => {
    updateSettings(
      {
        retryPolicy: {
          isSupported: !!retryPolicy?.isSupported,
          value: {
            type: selectedOption.key.toString(),
            count: retryPolicy?.value?.count,
            interval: retryPolicy?.value?.interval,
          },
        },
      },
      true
    );
  };

  const onRetryCountChange = (newVal: string): void => {
    updateSettings(
      {
        retryPolicy: {
          isSupported: !!retryPolicy?.isSupported,
          value: {
            ...(retryPolicy?.value as any),
            count: !isNaN(Number(newVal)) ? Number(newVal) : newVal,
          },
        },
      },
      true
    );
  };

  const onRetryIntervalChange = (newVal: string): void => {
    updateSettings(
      {
        retryPolicy: {
          isSupported: !!retryPolicy?.isSupported,
          value: {
            ...(retryPolicy?.value as any),
            interval: newVal,
          },
        },
      },
      true
    );
  };

  const onRetryMinIntervalChange = (newVal: string): void => {
    updateSettings(
      {
        retryPolicy: {
          isSupported: !!retryPolicy?.isSupported,
          value: {
            ...(retryPolicy?.value as any),
            minimumInterval: newVal,
          },
        },
      },
      true
    );
  };

  const onRetryMaxIntervalChange = (newVal: string): void => {
    updateSettings(
      {
        retryPolicy: {
          isSupported: !!retryPolicy?.isSupported,
          value: {
            ...(retryPolicy?.value as any),
            maximumInterval: newVal,
          },
        },
      },
      true
    );
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
    return (
      <Networking
        nodeId={nodeId}
        readOnly={readOnly}
        expanded={isExpanded}
        validationErrors={validationErrors}
        suppressWorkflowHeaders={suppressWorkflowHeaders}
        suppressWorkflowHeadersOnResponse={suppressWorkflowHeadersOnResponse}
        paging={paging}
        asynchronous={asynchronous}
        requestOptions={requestOptions}
        disableAsyncPattern={disableAsyncPattern}
        chunkedTransferMode={equals(uploadChunk?.value?.transferMode, constants.SETTINGS.TRANSFER_MODE.CHUNKED)}
        retryPolicy={retryPolicy}
        uploadChunk={uploadChunk}
        downloadChunkSize={downloadChunkSize}
        onHeaderClick={(sectionName) => dispatch(setExpandedSections(sectionName))}
        onAsyncPatternToggle={onAsyncPatternToggle}
        onAsyncResponseToggle={onAsyncResponseToggle}
        onContentTransferToggle={onContentTransferToggle}
        onPaginationToggle={onPaginationToggle}
        onPaginationValueChange={onPaginationValueChange}
        onRequestOptionsChange={onRequestOptionsChange}
        onHeadersOnResponseToggle={onHeadersOnResponseToggle}
        onSuppressHeadersToggle={onSuppressHeadersToggle}
        onRetryPolicyChange={onRetryPolicyChange}
        onRetryCountChange={onRetryCountChange}
        onRetryIntervalChange={onRetryIntervalChange}
        onRetryMinIntervalChange={onRetryMinIntervalChange}
        onRetryMaxIntervalChange={onRetryMaxIntervalChange}
      />
    );
  } else return null;
}

function RunAfterSettings({ nodeId, readOnly, isExpanded, validationErrors, dispatch }: SettingSectionProps): JSX.Element | null {
  const nodeData = useSelector((state: RootState) => state.workflow.operations[nodeId] as LogicAppsV2.ActionDefinition);
  const showRunAfterSettings = useMemo(() => Object.keys(nodeData?.runAfter ?? {}).length > 0, [nodeData]);

  return showRunAfterSettings ? (
    <RunAfter
      nodeId={nodeId}
      readOnly={readOnly}
      expanded={isExpanded}
      validationErrors={validationErrors}
      onHeaderClick={(sectionName) => dispatch(setExpandedSections(sectionName))}
    />
  ) : null;
}

function SecuritySettings({
  nodeId,
  readOnly,
  nodeSettings,
  isExpanded,
  dispatch,
  updateSettings,
}: SettingSectionProps): JSX.Element | null {
  const { secureInputs, secureOutputs } = nodeSettings;
  const operationInfo = useSelector((state: RootState) => state.operations.operationInfo[nodeId]);
  const onSecureInputsChange = (checked: boolean): void => {
    updateSettings({ secureInputs: { isSupported: !!secureInputs?.isSupported, value: checked } });
    if (isSecureOutputsLinkedToInputs(operationInfo.type)) {
      dispatch(updateTokenSecureStatus({ id: nodeId, isSecure: checked }));
    }
  };

  const onSecureOutputsChange = (checked: boolean): void => {
    updateSettings({ secureOutputs: { isSupported: !!secureOutputs?.isSupported, value: checked } });
    dispatch(updateTokenSecureStatus({ id: nodeId, isSecure: checked }));
  };

  return secureInputs?.isSupported || secureOutputs?.isSupported ? (
    <Security
      nodeId={nodeId}
      readOnly={readOnly}
      expanded={isExpanded}
      secureInputs={secureInputs}
      secureOutputs={secureOutputs}
      onHeaderClick={(sectionName) => dispatch(setExpandedSections(sectionName))}
      onSecureInputsChange={onSecureInputsChange}
      onSecureOutputsChange={onSecureOutputsChange}
    />
  ) : null;
}

function TrackingSettings({
  nodeId,
  readOnly,
  nodeSettings,
  isExpanded,
  dispatch,
  updateSettings,
}: SettingSectionProps): JSX.Element | null {
  const { trackedProperties, correlation } = nodeSettings;

  const onClientTrackingIdChange = (newValue: string): void => {
    updateSettings({
      correlation: {
        isSupported: !!correlation?.isSupported,
        value: {
          clientTrackingId: newValue,
        },
      },
    });
  };

  const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
    let trackedPropertiesInput: Record<string, any> | undefined = {}; // tslint:disable-line: no-any
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
    // if tracked properties is empty, set it to undefined
    if (Object.keys(trackedPropertiesInput).length === 0) {
      trackedPropertiesInput = undefined;
    }
    updateSettings({
      trackedProperties: {
        isSupported: !!trackedProperties?.isSupported,
        value: trackedPropertiesInput,
      },
    });
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

    if (trackedPropertiesInput === '') {
      trackedPropertiesInput = undefined;
    }
    updateSettings({
      trackedProperties: {
        isSupported: !!trackedProperties?.isSupported,
        value: trackedPropertiesInput,
      },
    });
  };

  if (trackedProperties?.isSupported || correlation?.isSupported) {
    return (
      <Tracking
        nodeId={nodeId}
        readOnly={readOnly}
        expanded={isExpanded}
        trackedProperties={trackedProperties}
        correlation={correlation}
        onHeaderClick={(sectionName) => dispatch(setExpandedSections(sectionName))}
        onClientTrackingIdChange={onClientTrackingIdChange}
        onTrackedPropertiesDictionaryValueChanged={onTrackedPropertiesDictionaryValueChanged}
        onTrackedPropertiesStringValueChange={onTrackedPropertiesStringValueChange}
      />
    );
  } else return null;
}
