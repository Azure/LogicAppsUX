import type { SectionProps } from '..';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const General = ({ splitOn, timeout, concurrency, conditionExpressions, readOnly }: SectionProps): JSX.Element => {
  const [concurrencyFromState, setConcurrency] = useState(concurrency?.value ?? { enabled: false, value: undefined });
  const [splitOnFromState, setSplitOn] = useState(splitOn?.value ?? { enabled: false, value: undefined });
  const [conditionExpressionsFromState, setConditionExpressions] = useState(conditionExpressions?.value ?? []);
  const [timeoutFromState, setTimeout] = useState(timeout?.value ?? '');

  const intl = useIntl();
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

  const splitOnLabel = <SettingLabel labelText={splitOnTitle} infoTooltipText={splitOnTooltipText} isChild={false} />;
  const timeoutLabel = <SettingLabel labelText={actionTimeoutTitle} infoTooltipText={actionTimeoutTooltipText} isChild={false} />;

  const concurrencyLabel = <SettingLabel labelText={concurrencyTitle} infoTooltipText={concurrencyTooltipText} isChild={false} />;
  const triggerConditionsLabel = (
    <SettingLabel labelText={triggerConditionsTitle} infoTooltipText={triggerConditionsTooltipText} isChild={false} />
  );

  const onConcurrencyToggle = (checked: boolean): void => {
    setConcurrency({ ...concurrencyFromState, enabled: checked });
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const onConcurrencyValueChange = (value: number): void => {
    setConcurrency({ ...concurrencyFromState, value });
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const onSplitOnToggle = (checked: boolean): void => {
    setSplitOn({ ...splitOnFromState, enabled: checked });
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const onTimeoutValueChange = (newVal: string): void => {
    setTimeout(newVal);
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const onTriggerConditionsChange = (newExpressions: string[]): void => {
    setConditionExpressions(newExpressions);
  };

  const generalSectionProps: SettingSectionProps = {
    id: 'general',
    title: generalTitle,
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: splitOnFromState.enabled,
          onToggleInputChange: (_, checked) => onSplitOnToggle(!!checked), // build onSplitOnChange handler
          customLabel: () => splitOnLabel,
          onText,
          offText,
        },
        visible: splitOn?.isSupported,
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'timeoutDuration',
          value: timeoutFromState,
          customLabel: () => timeoutLabel,
          readOnly,
          onValueChange: (_, newValue) => onTimeoutValueChange(newValue as string),
        },
        visible: timeout?.isSupported,
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: concurrencyFromState.enabled,
          onToggleInputChange: (_, checked) => onConcurrencyToggle(!!checked),
          customLabel: () => concurrencyLabel,
          onText,
          offText,
        },
        visible: concurrency?.isSupported,
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          maxVal: 100,
          minVal: 0,
          value: concurrencyFromState.value ?? 50,
          onValueChange: onConcurrencyValueChange,
          sliderLabel: degreeOfParallelism,
          readOnly,
        },
        visible: concurrencyFromState.enabled === true,
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: {
          initialExpressions: conditionExpressionsFromState,
          readOnly,
          customLabel: () => triggerConditionsLabel,
          onExpressionsChange: onTriggerConditionsChange,
        },
        visible: conditionExpressions?.isSupported,
      },
    ],
  };

  return <SettingsSection {...generalSectionProps} />;
};
