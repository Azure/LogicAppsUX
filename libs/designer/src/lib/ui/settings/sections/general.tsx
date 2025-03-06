import type { SectionProps, ToggleHandler, TextChangeHandler, NumberChangeHandler, MaximumWaitingRunsMetadata } from '..';
import { SettingSectionName } from '..';
import constants from '../../../common/constants';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { useOutputParameters } from '../../../core/state/selectors/actionMetadataSelector';
import { getSplitOnOptions } from '../../../core/utils/outputs';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { OperationManifestService } from '@microsoft/logic-apps-shared';
import { getSettingLabel, type DropdownSelectionChangeHandler, type ExpressionChangeHandler } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import type { FormEvent } from 'react';

export interface GeneralSectionProps extends SectionProps {
  maximumWaitingRunsMetadata: MaximumWaitingRunsMetadata;
  onConcurrencyToggle: ToggleHandler;
  onConcurrencyRunValueChange: NumberChangeHandler;
  onConcurrencyMaxWaitRunChange: NumberChangeHandler;
  onInvokerConnectionToggle: ToggleHandler;
  onSplitOnToggle: ToggleHandler;
  onSplitOnSelectionChanged: DropdownSelectionChangeHandler;
  onTimeoutValueChange: TextChangeHandler;
  onTriggerConditionsChange: ExpressionChangeHandler;
  onClientTrackingIdChange: TextChangeHandler;
}

export const General = ({
  nodeId,
  readOnly,
  expanded,
  splitOn,
  splitOnConfiguration,
  timeout,
  concurrency,
  conditionExpressions,
  invokerConnection,
  maximumWaitingRunsMetadata,
  onConcurrencyToggle,
  onConcurrencyRunValueChange,
  onConcurrencyMaxWaitRunChange,
  onInvokerConnectionToggle,
  onSplitOnToggle,
  onSplitOnSelectionChanged,
  onTimeoutValueChange,
  onTriggerConditionsChange,
  onClientTrackingIdChange,
  onHeaderClick,
  validationErrors,
}: GeneralSectionProps): JSX.Element => {
  const intl = useIntl();
  const nodesMetadata = useNodeMetadata(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const nodeOutputs = useOutputParameters(nodeId);
  const isTrigger = nodesMetadata?.isRoot ?? false;
  const generalTitle = intl.formatMessage({
    defaultMessage: 'General',
    id: '57efdcdb55f6',
    description: 'title for general setting section',
  });
  const degreeOfParallelism = intl.formatMessage({
    defaultMessage: 'Degree of parallelism',
    id: '78e009424240',
    description: 'label for slider indicating the degree of parallelism',
  });
  const splitOnTitle = intl.formatMessage({
    defaultMessage: 'Split on',
    id: '7fb7315db8d9',
    description: 'title for split on setting',
  });
  const splitOnTooltipText = intl.formatMessage({
    defaultMessage:
      'Enable split-on to start an instance of the workflow per item in the selected array. Each instance can also have a distinct tracking id',
    id: '7a8d58297b0a',
    description: 'description of the split on setting',
  });
  const actionTimeoutTitle = intl.formatMessage({
    defaultMessage: 'Action timeout',
    id: '33f9b79c6e13',
    description: 'title for action timeout setting',
  });
  const actionTimeoutTooltipText = intl.formatMessage({
    defaultMessage:
      'Limit the maximum duration between the retries and asynchronous responses for this action. Note: This does not alter the request timeout of a single request',
    id: 'ab36a8451a7b',
    description: 'description of action timeout setting',
  });
  const actionTimeoutFormatDescription = intl.formatMessage({
    defaultMessage: 'Specify the duration in ISO 8601 format',
    id: '787b0eb26fc8',
    description: 'description of action timeout format description',
  });
  const concurrencyTitle = intl.formatMessage({
    defaultMessage: 'Concurrency control',
    id: '4b2e1c1420c9',
    description: 'title for concurrency setting',
  });
  const concurrencyTooltipText = intl.formatMessage({
    defaultMessage: 'Control how new runs are queued',
    id: 'd8c380d71d9b',
    description: 'tooltip text of concurrency setting',
  });
  const concurrencyDescription = intl.formatMessage({
    defaultMessage: `By default, Logic App instances run at the same time, or in parallel. This control changes how new runs are queued and can't be changed after enabling. To run as many parallel instances as possible, leave this control turned off. To limit the number of parallel runs, turn on this control, and select a limit. To run sequentially, select 1 as the limit.`,
    id: '6d604c85eed2',
    description: 'description of concurrency setting',
  });
  const concurrencySubLabel = intl.formatMessage({
    defaultMessage: 'Limit',
    id: '83bfc42827ab',
    description: 'sublabel for concurrency limit toggle button',
  });
  const maxWaitingRunsTitle = intl.formatMessage({
    defaultMessage: 'Maximum waiting runs',
    id: '14461d931189',
    description: 'Label for maximum waiting runs',
  });
  const maximumWaitingRunsTooltipText = intl.formatMessage({
    defaultMessage:
      'The number of workflow instances that can wait to run when your current workflow instance is already running the maximum concurrent instances.',
    id: '132c5aeaa2ee',
    description: 'tooltip of maximum waiting runs setting',
  });
  const maximumWaitingDescription = intl.formatMessage(
    {
      defaultMessage: 'Enter a positive integer between {min} and {max}',
      id: 'fa5e57999699',
      description: 'description of maximum waiting runs setting',
    },
    { max: maximumWaitingRunsMetadata.max, min: maximumWaitingRunsMetadata.min }
  );
  const triggerConditionsTitle = intl.formatMessage({
    defaultMessage: 'Trigger conditions',
    id: '603a1cf733f2',
    description: 'Title for trigger conditions setting',
  });
  const triggerConditionsTooltipText = intl.formatMessage({
    defaultMessage: 'Specify one or more expressions that must be true for the trigger to fire',
    id: '5c9901ad9024',
    description: 'The description for the trigger condition expression setting.',
  });
  const splitOnTrackingId = intl.formatMessage({
    defaultMessage: 'Split-on tracking ID',
    id: 'd013bfb4ee1f',
    description: 'Title for split on client tracking id setting',
  });
  const splitOnTrackingIdTooltipText = intl.formatMessage({
    defaultMessage: 'Distinct tracking ID for each split-on instance',
    id: '37c2e026ad0b',
    description: 'Description of tracking id input field of split on setting',
  });
  const arrayDropdownTitle = intl.formatMessage({
    defaultMessage: 'Array',
    id: '05ec267adcc2',
    description: 'Title for array dropdown input setting',
  });
  const invokerConnectionTitle = intl.formatMessage({
    defaultMessage: `Use Invoker's Connection`,
    id: '6d63acbe8c4e',
    description: 'Title for invoker connection',
  });
  const invokerConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'When enabled, this action will run with the user from the "Run as" setting in the Dataverse trigger',
    id: '2d1021480220',
    description: 'Description of invoker connection setting',
  });
  const examplePlaceholderText = intl.formatMessage({
    defaultMessage: 'Example:',
    id: '3733e715263a',
    description: 'Placeholder text for an example input field',
  });

  const generalSectionProps: SettingsSectionProps = {
    id: 'general',
    nodeId,
    title: generalTitle,
    sectionName: SettingSectionName.GENERAL,
    isReadOnly: readOnly,
    expanded,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: splitOn?.value?.enabled ?? true,
          onToggleInputChange: (_, checked) => onSplitOnToggle(!!checked),
          customLabel: getSettingLabel(splitOnTitle, splitOnTooltipText),
          ariaLabel: splitOnTitle,
        },
        visible: splitOn?.isSupported,
      },
      {
        settingType: 'SettingDropdown',
        settingProp: {
          id: 'arrayValue',
          readOnly: readOnly || !splitOn?.value?.enabled,
          items: getSplitOnOptions(nodeOutputs, OperationManifestService().isSupported(operationInfo?.type, operationInfo?.kind)).map(
            (option) => ({ title: option, value: option })
          ),
          selectedValue: splitOn?.value?.value,
          onSelectionChanged: onSplitOnSelectionChanged,
          customLabel: getSettingLabel(arrayDropdownTitle),
          ariaLabel: arrayDropdownTitle,
        },
        visible: splitOn?.isSupported && splitOn?.value?.enabled,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'splitOntrackingId',
          value: splitOnConfiguration?.correlation?.clientTrackingId ?? '',
          readOnly: readOnly || !splitOn?.value?.enabled,
          customLabel: getSettingLabel(splitOnTrackingId, splitOnTrackingIdTooltipText),
          onValueChange: (_, newVal) => onClientTrackingIdChange(newVal as string),
          ariaLabel: splitOnTrackingId,
        },
        visible: splitOn?.isSupported && splitOn?.value?.enabled,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'timeoutDuration',
          value: timeout?.value ?? '',
          customLabel: getSettingLabel(actionTimeoutTitle, actionTimeoutTooltipText, actionTimeoutFormatDescription),
          readOnly,
          onValueChange: (_, newValue) => onTimeoutValueChange(newValue as string),
          ariaLabel: actionTimeoutTitle,
          placeholder: `${examplePlaceholderText} P1D`,
        },
        visible: timeout?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: concurrency?.value?.enabled,
          onToggleInputChange: (_, checked) => onConcurrencyToggle(!!checked),
          customLabel: getSettingLabel(
            concurrencyTitle,
            concurrencyTooltipText,
            concurrencyDescription,
            concurrencySubLabel,
            /* isSubLabelToggle*/ true
          ),
          ariaLabel: concurrencySubLabel,
        },
        visible: concurrency?.isSupported,
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          maxVal: isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.MAX : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MAX,
          minVal: isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.MIN : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MIN,
          value:
            concurrency?.value?.runs ??
            (isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.DEFAULT : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.DEFAULT),
          onValueChange: onConcurrencyRunValueChange,
          sliderLabel: degreeOfParallelism,
          readOnly,
          ariaLabel: degreeOfParallelism,
        },
        visible: concurrency?.isSupported && concurrency?.value?.enabled,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          readOnly,
          value: concurrency?.value?.maximumWaitingRuns ?? 10,
          placeholder: maximumWaitingDescription,
          customLabel: getSettingLabel(maxWaitingRunsTitle, maximumWaitingRunsTooltipText),
          ariaLabel: maxWaitingRunsTitle,
          onValueChange: (_e: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) =>
            onConcurrencyMaxWaitRunChange(Number(newValue)),
          max: maximumWaitingRunsMetadata.max,
          min: maximumWaitingRunsMetadata.min,
          type: 'number',
        },
        visible: isTrigger && concurrency?.isSupported && concurrency?.value?.enabled,
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: {
          initialExpressions: conditionExpressions?.value,
          readOnly,
          customLabel: getSettingLabel(triggerConditionsTitle, triggerConditionsTooltipText),
          onExpressionsChange: onTriggerConditionsChange,
          ariaLabel: triggerConditionsTitle,
        },
        visible: conditionExpressions?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: invokerConnection?.value?.enabled,
          onToggleInputChange: (_, checked) => onInvokerConnectionToggle(!!checked),
          customLabel: getSettingLabel(invokerConnectionTitle, invokerConnectionTooltipText),
          ariaLabel: invokerConnectionTitle,
        },
        visible: invokerConnection?.isSupported,
      },
    ],
    validationErrors,
  };

  return <SettingsSection {...generalSectionProps} />;
};
