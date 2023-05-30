import type { SectionProps, ToggleHandler, TextChangeHandler, NumberChangeHandler } from '..';
import constants from '../../../common/constants';
import type { RootState } from '../../../core';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { getSplitOnOptions } from '../../../core/utils/outputs';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { DropdownSelectionChangeHandler, ExpressionChangeHandler } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

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
  splitOn,
  splitOnConfiguration,
  timeout,
  concurrency,
  conditionExpressions,
  invokerConnection,
  readOnly,
  onConcurrencyToggle,
  onConcurrencyValueChange,
  onInvokerConnectionToggle,
  onSplitOnToggle,
  onSplitOnSelectionChanged,
  onTimeoutValueChange,
  onTriggerConditionsChange,
  onClientTrackingIdChange,
  expanded,
  onHeaderClick,
  validationErrors,
}: GeneralSectionProps): JSX.Element => {
  const intl = useIntl();
  const nodeId = useSelectedNodeId();
  const { nodeOutputs, operationInfo } = useSelector((state: RootState) => ({
    nodeOutputs: state.operations.outputParameters[nodeId],
    operationInfo: state.operations.operationInfo[nodeId],
  }));
  const generalTitle = intl.formatMessage({
    defaultMessage: 'General',
    description: 'title for general setting section',
  });
  const degreeOfParallelism = intl.formatMessage({
    defaultMessage: 'Degree of Parallelism',
    description: 'label for slider indicating the degree of parallelism',
  });
  const onText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'label when setting is on',
  });
  const offText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'label when setting is off',
  });
  const splitOnTitle = intl.formatMessage({
    defaultMessage: 'Split On',
    description: 'title for split on setting',
  });
  const splitOnTooltipText = intl.formatMessage({
    defaultMessage:
      'Enable split-on to start an instance of the workflow per item in the selected array. Each instance can also have a distinct tracking id.',
    description: 'description of the split on setting',
  });
  const actionTimeoutTitle = intl.formatMessage({
    defaultMessage: 'Action Timeout',
    description: 'tit;e for action timeout setting',
  });
  const actionTimeoutTooltipText = intl.formatMessage({
    defaultMessage:
      'Limit the maximum duration between the retries and asynchronous responses for this action. Note: This does not alter the request timeout of a single request.',
    description: 'description of action timeout setting',
  });
  const concurrencyTitle = intl.formatMessage({
    defaultMessage: 'Concurrency Control',
    description: 'title for concurrency setting',
  });

  const concurrencyTooltipText = intl.formatMessage({
    defaultMessage:
      "By default, Logic App instances run at the same time, or in parallel. This control changes how new runs are queued and can't be changed after enabling. To run as many parallel instances as possible, leave this control turned off. To limit the number of parallel runs, turn on this control, and select a limit. To run sequentially, select 1 as the limit.",
    description: 'description of concurrency setting',
  });
  const triggerConditionsTitle = intl.formatMessage({
    defaultMessage: 'Trigger Conditions',
    description: 'title for trigger conditions setting',
  });
  const triggerConditionsTooltipText = intl.formatMessage({
    defaultMessage: 'Specify one or more expressions which must be true for the trigger to fire.',
    description: 'description of tigger confition expression setting',
  });
  const clientTrackingId = intl.formatMessage({
    defaultMessage: 'Custom Tracking Id',
    description: 'title for client tracking id setting',
  });
  const clientTrackingIdTooltipText = intl.formatMessage({
    defaultMessage: 'Set the tracking id for the run. For split-on this tracking id is for the initiating request.',
    description: 'description of tracking id input field of split on setting',
  });
  const arrayDropdownTitle = intl.formatMessage({
    defaultMessage: 'Array',
    description: 'title for array dropdown input setting',
  });
  const invokerConnectionTitle = intl.formatMessage({
    defaultMessage: "Use Invoker's Connection",
    description: 'title for invoker connection',
  });
  const invokerConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'When enabled, this action will run with the user from the "Run as" setting in the Dataverse trigger.',
    description: 'description of invoker connection setting',
  });

  const splitOnLabel = <SettingLabel labelText={splitOnTitle} infoTooltipText={splitOnTooltipText} isChild={false} />;
  const clientTrackingIdLabel = <SettingLabel labelText={clientTrackingId} infoTooltipText={clientTrackingIdTooltipText} isChild={true} />;
  const timeoutLabel = <SettingLabel labelText={actionTimeoutTitle} infoTooltipText={actionTimeoutTooltipText} isChild={false} />;
  const concurrencyLabel = <SettingLabel labelText={concurrencyTitle} infoTooltipText={concurrencyTooltipText} isChild={false} />;
  const arrayDropdownLabel = <SettingLabel labelText={arrayDropdownTitle} isChild={true} />;
  const invokerConnectionLabel = (
    <SettingLabel labelText={invokerConnectionTitle} infoTooltipText={invokerConnectionTooltipText} isChild={false} />
  );
  const triggerConditionsLabel = (
    <SettingLabel labelText={triggerConditionsTitle} infoTooltipText={triggerConditionsTooltipText} isChild={false} />
  );

  const generalSectionProps: SettingsSectionProps = {
    id: 'general',
    title: generalTitle,
    sectionName: constants.SETTINGSECTIONS.GENERAL,
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
          customLabel: () => splitOnLabel,
          onText,
          offText,
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
          customLabel: () => arrayDropdownLabel,
          ariaLabel: arrayDropdownTitle,
        },
        visible: splitOn?.isSupported,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'splitOntrackingId',
          value: splitOnConfiguration?.correlation?.clientTrackingId ?? '',
          readOnly: readOnly || !splitOn?.value?.enabled,
          customLabel: () => clientTrackingIdLabel,
          onValueChange: (_, newVal) => onClientTrackingIdChange(newVal as string),
          ariaLabel: clientTrackingId,
        },
        visible: splitOn?.isSupported,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'timeoutDuration',
          value: timeout?.value ?? '',
          customLabel: () => timeoutLabel,
          readOnly,
          onValueChange: (_, newValue) => onTimeoutValueChange(newValue as string),
          ariaLabel: actionTimeoutTitle,
        },
        visible: timeout?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: concurrency?.value?.enabled,
          onToggleInputChange: (_, checked) => onConcurrencyToggle(!!checked),
          customLabel: () => concurrencyLabel,
          onText,
          offText,
          ariaLabel: concurrencyTitle,
        },
        visible: concurrency?.isSupported,
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          maxVal: constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MAX,
          minVal: constants.CONCURRENCY_ACTION_SLIDER_LIMITS.MIN,
          value: concurrency?.value?.value ?? constants.CONCURRENCY_ACTION_SLIDER_LIMITS.DEFAULT,
          onValueChange: onConcurrencyValueChange,
          sliderLabel: degreeOfParallelism,
          readOnly,
          ariaLabel: concurrencyTitle,
        },
        visible: concurrency?.value?.enabled === true,
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: {
          initialExpressions: conditionExpressions?.value,
          readOnly,
          customLabel: () => triggerConditionsLabel,
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
          customLabel: () => invokerConnectionLabel,
          onText,
          offText,
          ariaLabel: invokerConnectionTitle,
        },
        visible: invokerConnection?.isSupported,
      },
    ],
    validationErrors,
  };

  return <SettingsSection {...generalSectionProps} />;
};
