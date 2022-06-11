import type { SectionProps } from '..';
import { SettingLabel } from './security';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useState } from 'react';

export const Tracking = ({ readOnly, /*nodeId*/ correlation /*trackedProperties*/ }: SectionProps): JSX.Element | null => {
  const [correlationFromState, setCorrelation] = useState(correlation);
  // const [ trackedPropertiesFromState, setTrackedProperties ] = useState(trackedProperties);

  const clientTrackingIdLabel = (
    <SettingLabel
      labelText="Custom Tracking Id"
      infoTooltipText="Set the tracking id for the run. For split-on this tracking id is for the initiating request."
      isChild={false}
    />
  );

  const onClientTrackingIdChange = (newValue: string): void => {
    setCorrelation({ clientTrackingId: newValue });
    // validate?
    // dispatch change action to store
  };

  const trackingSectionProps: SettingSectionProps = {
    id: 'tracking',
    title: 'Tracking',
    settings: [
      {
        settingType: 'SettingTextField',
        settingProp: {
          readOnly,
          visible: true, //isCorrelationSupported(nodeId)
          value: correlationFromState?.clientTrackingId ?? '',
          label: 'Tracking Id',
          customLabel: () => clientTrackingIdLabel,
          onValueChange: (_, newVal) => onClientTrackingIdChange(newVal as string),
        },
        // {ADD TRACKED PROPERTIES}
      },
    ],
  };

  return <SettingsSection {...trackingSectionProps} />;
};
