import type { SectionProps } from '..';
// import updateNodeSettings  from '../../../core/state/operationMetadataSlice';
// import { SettingLabel } from './security';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';
import { useState } from 'react';

// import { useDispatch } from 'react-redux';

export const General = ({ splitOn, timeout, concurrency, conditionExpressions, readOnly /*nodeId*/ }: SectionProps): JSX.Element => {
  const [concurrencyFromState, setConcurrency] = useState(concurrency?.value ?? { enabled: false, value: undefined });
  const [splitOnFromState, setSplitOn] = useState(splitOn?.value ?? { enabled: false, value: undefined });
  const [conditionExpressionsFromState /*setConditionExpressions*/] = useState(conditionExpressions?.value ?? []);
  const [timeoutFromState, setTimeout] = useState(timeout?.value ?? '');
  // const dispatch = useDispatch();

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
  // const timeoutDurationLabel = (
  //   <SettingLabel labelText="Duration" infoTooltipText="Specify the duration in ISO 8601 format." isChild={true} />
  // );
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

  const onConcurrencyToggle = (checked: boolean): void => {
    setConcurrency({ ...concurrencyFromState, enabled: checked });
    // write to store w/ paylaod {concurrency: {enabled: !!checked, value: settings.concurrency.value}}
    // dispatch(updateNodeSettings({ id: nodeId, settings: { concurrency: { enabled: true, value: concurrencyValues?.value } } }));
  };

  const onConcurrencyValueChange = (value: number): void => {
    setConcurrency({ ...concurrencyFromState, value });
    // write to store with payload: concurrency: {enabled: !!checked, value}
    // dispatch(updateNodeSettings({ id: nodeId, settings: { concurrency: { enabled: concurrency, value } } }));
  };

  const onSplitOnToggle = (checked: boolean): void => {
    //  validation?
    setSplitOn({ ...splitOnFromState, enabled: checked });
    // dispatch(updateNodeSettings({ id: nodeId, settings: { splitOn: { enabled: !!checked, value: splitOn?.value } } }));
  };

  // const onSplitOnvalueChange = (value: string): void => {

  // }

  const onTimeoutValueChange = (newVal: string): void => {
    setTimeout(newVal);
    // validate if necessary
    // dispatch to store
  };

  const generalSectionProps: SettingSectionProps = {
    id: 'general',
    title: 'General',
    expanded: false,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: splitOnFromState.enabled,
          onToggleInputChange: (_, checked) => onSplitOnToggle(!!checked), // build onSplitOnChange handler
          customLabel: () => splitOnLabel,
          onText: 'On',
          offText: 'Off',
        },
        visible: splitOn?.isSupported, //isSupported fn
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
        visible: timeout?.isSupported, // isSupported fn
      },
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly,
          checked: concurrencyFromState.enabled,
          onToggleInputChange: (_, checked) => onConcurrencyToggle(!!checked),
          customLabel: () => concurrencyLabel,
          onText: 'On',
          offText: 'Off',
        },
        visible: concurrency?.isSupported, //isConcurrencySupported?
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: {
          maxVal: 100,
          minVal: 0,
          value: concurrencyFromState.value ?? 50,
          onValueChange: onConcurrencyValueChange,
          sliderLabel: 'Degree of Parallelism',
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
        },
        visible: conditionExpressions?.isSupported, // isSupported fn
      },
    ],
  }; // render sectionProps conditionally based on which settings are enabled for given operation
  return <SettingsSection {...generalSectionProps} />;
};
