import { SettingLabel } from './security';
import type { Settings, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';

export const General = (): JSX.Element => {
  const splitOnLabel = <SettingLabel labelText="Split On" infoTooltipText="" isChild={false} />;
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

  const generalSectionProps: SettingSectionProps = {
    id: 'general',
    title: 'General',
    expanded: true,
    settings: [
      {
        settingType: 'SettingToggle',
        settingProp: {
          readOnly: false,
          defaultChecked: false,
          onToggleInputChange: () => console.log('toggled'),
          label: splitOnLabel,
        },
      },
      {
        settingType: 'SettingTextField',
        settingProp: {
          id: 'timeoutDuration',
          value: '',
          customLabel: () => timeoutLabel,
          readOnly: false,
          onValueChange: (_, newValue) => console.log(newValue),
        },
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: {
          initialExpressions: ['Hello', 'Friends'],
          readOnly: false,
          visible: true,
          customLabel: () => triggerConditionsLabel,
        },
      },
    ],
  };
  return <SettingsSection {...generalSectionProps} />;
};
