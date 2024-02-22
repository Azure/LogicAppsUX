import type { SectionProps, ToggleHandler, TextChangeHandler, NumberChangeHandler } from '..';
import { SettingSectionName } from '..';
import constants from '../../../common/constants';
import { useNodeMetadata, useOperationInfo } from '../../../core';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { useOutputParameters } from '../../../core/state/selectors/actionMetadataSelector';
import { getSplitOnOptions } from '../../../core/utils/outputs';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { OperationManifestService } from '@microsoft/logic-apps-shared';
import { getSettingLabel, type DropdownSelectionChangeHandler, type ExpressionChangeHandler } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface GeneralSectionProps extends SectionProps {
  onConcurrencyToggle: ToggleHandler;
  onConcurrencyValueChange: NumberChangeHandler;
  onInvokerConnectionToggle: ToggleHandler;
  onSplitOnToggle: ToggleHandler;
  onSplitOnSelectionChanged: DropdownSelectionChangeHandler;
  onTimeoutValueChange: TextChangeHandler;
  onTriggerConditionsChange: ExpressionChangeHandler;
  onClientTrackingIdChange: TextChangeHandler;
}

export const General = ({
  readOnly,
  expanded,
  splitOn,
  splitOnConfiguration,
  timeout,
  concurrency,
  conditionExpressions,
  invokerConnection,
  onConcurrencyToggle,
  onConcurrencyValueChange,
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
  const nodeId = useSelectedNodeId();
  const nodesMetadata = useNodeMetadata(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const nodeOutputs = useOutputParameters(nodeId);
  const isTrigger = nodesMetadata?.isRoot ?? false;
  const generalTitle = intl.formatMessage({
    defaultMessage: 'General',
    description: 'title for general setting section',
  });
  const degreeOfParallelism = intl.formatMessage({
    defaultMessage: 'Degree of Parallelism',
    description: 'label for slider indicating the degree of parallelism',
  });
  const splitOnTitle = intl.formatMessage({
    defaultMessage: 'Split On',
    description: 'title for split on setting',
  });
  const splitOnTooltipText = intl.formatMessage({
    defaultMessage:
      'Enable split-on to start an instance of the workflow per item in the selected array. Each instance can also have a distinct tracking id',
    description: 'description of the split on setting',
  });
  const actionTimeoutTitle = intl.formatMessage({
    defaultMessage: 'Action Timeout',
    description: 'title for action timeout setting',
  });
  const actionTimeoutTooltipText = intl.formatMessage({
    defaultMessage:
      'Limit the maximum duration between the retries and asynchronous responses for this action. Note: This does not alter the request timeout of a single request',
    description: 'description of action timeout setting',
  });
  const actionTimeoutFormatDescription = intl.formatMessage({
    defaultMessage: 'Specify the duration in ISO 8601 format',
    description: 'description of action timeout format description',
  });
  const concurrencyTitle = intl.formatMessage({
    defaultMessage: 'Concurrency Control',
    description: 'title for concurrency setting',
  });

  const concurrencyTooltipText = intl.formatMessage({
    defaultMessage: 'Control how new runs are queued',
    description: 'tooltip text of concurrency setting',
  });
  const concurrencyDescription = intl.formatMessage({
    defaultMessage:
      "By default, Logic App instances run at the same time, or in parallel. This control changes how new runs are queued and can't be changed after enabling. To run as many parallel instances as possible, leave this control turned off. To limit the number of parallel runs, turn on this control, and select a limit. To run sequentially, select 1 as the limit.",
    description: 'description of concurrency setting',
  });
  const concurrencySubLabel = intl.formatMessage({
    defaultMessage: 'Limit',
    description: 'sublabel for concurrency limit toggle button',
  });
  const triggerConditionsTitle = intl.formatMessage({
    defaultMessage: 'Trigger conditions',
    description: 'Title for trigger conditions setting',
  });
  const triggerConditionsTooltipText = intl.formatMessage({
    defaultMessage: 'Specify one or more expressions that must be true for the trigger to fire',
    description: 'The description for the trigger condition expression setting.',
  });
  const splitOnTrackingId = intl.formatMessage({
    defaultMessage: 'Split-On Tracking Id',
    description: 'Title for split on client tracking id setting',
  });
  const splitOnTrackingIdTooltipText = intl.formatMessage({
    defaultMessage: 'Distinct Tracking id for each split-on instance',
    description: 'Description of tracking id input field of split on setting',
  });
  const arrayDropdownTitle = intl.formatMessage({
    defaultMessage: 'Array',
    description: 'Title for array dropdown input setting',
  });
  const invokerConnectionTitle = intl.formatMessage({
    defaultMessage: "Use Invoker's Connection",
    description: 'Title for invoker connection',
  });
  const invokerConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'When enabled, this action will run with the user from the "Run as" setting in the Dataverse trigger',
    description: 'Description of invoker connection setting',
  });
  const examplePlaceholderText = intl.formatMessage({
    defaultMessage: 'Example:',
    description: 'Placeholder text for an example input field',
  });

  const generalSectionProps: SettingsSectionProps = {
    id: 'general',
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
          ariaLabel: concurrencyTitle,
        },
        visible: concurrency?.isSupported,
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          maxVal: isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.MAX : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MAX,
          minVal: isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.MIN : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MIN,
          value:
            concurrency?.value?.value ??
            (isTrigger ? constants.CONCURRENCY_TRIGGER_SLIDER_LIMITS.DEFAULT : constants.CONCURRENCY_ACTION_SLIDER_LIMITS.DEFAULT),
          onValueChange: onConcurrencyValueChange,
          sliderLabel: degreeOfParallelism,
          readOnly,
          ariaLabel: concurrencyTitle,
        },
        visible: concurrency?.isSupported && concurrency?.value?.enabled,
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
