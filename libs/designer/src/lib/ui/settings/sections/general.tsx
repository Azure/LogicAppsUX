import type { SectionProps } from '..';
// import { updateNodeSettings } from '../../../core/state/operationMetadataSlice';
import { SettingLabel } from './security';
import { useBoolean } from '@fluentui/react-hooks';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export const General = ({
  splitOn,
  timeout,
  concurrency: concurrencyValues,
  conditionExpressions,
  readOnly,
  nodeId,
}: SectionProps): JSX.Element => {
  const [concurrency, setConcurrency] = useBoolean(concurrencyValues?.enabled ?? false);
  const dispatch = useDispatch();
  const splitOnLabel = (
    <SettingLabel
      labelText="Split On"
      infoTooltipText="Enable split-on to start an instance of the workflow per item in the selected array. Each instance can also have a distinct tracking id."
      isChild={false}
    />
  );
  const timeoutLabel = (
    <SettingLabel
      labelText="Action Timeout"
      infoTooltipText="Limit the maximum duration between the retries and asynchronous responses for this action. Note: This does not alter the request timeout of a single request."
      isChild={false}
    />
  );
  const timeoutDurationLabel = (
    <SettingLabel labelText="Duration" infoTooltipText="Specify the duration in ISO 8601 format." isChild={true} />
  );
  const concurrencyLabel = (
    <SettingLabel
      labelText="Concurrency Control"
      infoTooltipText="By default, Logic App instances run at the same time, or in parallel. This control changes how new runs are queued and can't be changed after enabling.
    To run as many parallel instances as possible, leave this control turned off. To limit the number of parallel runs, turn on this control, and select a limit. To run sequentially, select 1 as the limit."
      isChild={false}
    />
  );
  const triggerConditionsLabel = (
    <SettingLabel
      labelText="Trigger Conditions"
      infoTooltipText="Specify one or more expressions which must be true for the trigger to fire."
      isChild={false}
    />
  );

  const onConcurrencyChange = (checked: boolean | undefined): void => {
    setConcurrency.toggle();
    // write to store w/ paylaod {concurrency: {enabled: !!checked, value: settings.concurrency.value}}
    // dispatch(updateNodeSettings({ id: nodeId, settings: { concurrency: { enabled: true, value: concurrencyValues?.value } } }));
  };

  const onConcurrencyValueChange = (value: number): void => {
    // write to store with payload: concurrency: {enabled: !!checked, value}
    // dispatch(updateNodeSettings({ id: nodeId, settings: { concurrency: { enabled: concurrency, value } } }));
  };

  const onSplitOnToggle = (checked: boolean): void => {
    //  validation?
    // dispatch(updateNodeSettings({ id: nodeId, settings: { splitOn: { enabled: !!checked, value: splitOn?.value } } }));
  };

  const generalSectionProps: SettingSectionProps = {
    id: 'general',
    title: 'General',
    expanded: true,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: splitOn !== undefined,
          readOnly,
          checked: splitOn?.enabled,
          onToggleInputChange: (_, checked) => onSplitOnToggle(!!checked), // build onSplitOnChange handler
          customLabel: () => splitOnLabel,
        },
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          visible: timeout !== undefined,
          id: 'timeoutDuration',
          value: '',
          customLabel: () => timeoutLabel,
          readOnly,
          onValueChange: (_, newValue) => console.log(newValue),
        },
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: {
          visible: conditionExpressions !== undefined,
          initialExpressions: conditionExpressions,
          readOnly,
          customLabel: () => triggerConditionsLabel,
        },
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          visible: concurrencyValues !== undefined && concurrencyValues.value !== undefined, //isConcurrencyEnabled?
          readOnly,
          checked: concurrency,
          onToggleInputChange: (_, checked) => onConcurrencyChange(!!checked),
          customLabel: () => concurrencyLabel,
        },
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          visible: concurrency === true,
          maxVal: 100,
          minVal: 0,
          value: concurrencyValues?.value ?? 0,
          customLabel: () => concurrencyLabel,
          onValueChange: onConcurrencyValueChange,
          sliderLabel: 'Degree of Parallelism',
          readOnly,
        },
      },
    ],
  }; // render sectionProps conditionally based on which settings are enabled for given operation
  return <SettingsSection {...generalSectionProps} />;
};
