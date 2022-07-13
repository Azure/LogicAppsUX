import type { SectionProps } from '..';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { isObject } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const Tracking = ({ readOnly, correlation, trackedProperties }: SectionProps): JSX.Element | null => {
  const [correlationFromState, setCorrelation] = useState(correlation?.value ?? { clientTrackingId: '' });
  const [trackedPropertiesFromState, setTrackedProperties] = useState(trackedProperties?.value);

  const intl = useIntl();
  const clientIdTrackingTitle = intl.formatMessage({
    defaultMessage: 'Custom Tracking Id',
    description: 'title for client tracking id setting',
  });
  const clientTrackingTootltipText = intl.formatMessage({
    defaultMessage: 'Set the tracking id for the run. For split-on this tracking id is for the initiating request.',
    description: 'description for client tracking id setting',
  });
  const trackingTitle = intl.formatMessage({
    defaultMessage: 'Tracking',
    description: 'title for tracking component',
  });
  const trackedPropertiesTitle = intl.formatMessage({
    defaultMessage: 'Tracked Properties',
    description: 'title for tracked properties setting',
  });

  const clientTrackingIdLabel = (
    <SettingLabel labelText={clientIdTrackingTitle} infoTooltipText={clientTrackingTootltipText} isChild={false} />
  );

  const onClientTrackingIdChange = (newValue: string): void => {
    setCorrelation({ clientTrackingId: newValue });
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
    let trackedProperties: Record<string, any> = {}; // tslint:disable-line: no-any
    if (isObject(newValue) && Object.keys(newValue).length > 0 && Object.keys(newValue).some((key) => newValue[key] !== undefined)) {
      trackedProperties = {};
      for (const key of Object.keys(newValue)) {
        let propertyValue: any; // tslint:disable-line: no-any
        try {
          propertyValue = JSON.parse(newValue[key]);
        } catch {
          propertyValue = newValue[key];
        }

        trackedProperties[key] = propertyValue;
      }
    }
    setTrackedProperties(trackedProperties);
  };

  const onTrackedPropertiesStringValueChange = (newValue: string): void => {
    let trackedProperties: any = ''; // tslint:disable-line: no-any
    if (newValue) {
      try {
        trackedProperties = JSON.parse(newValue);
      } catch {
        trackedProperties = newValue;
      }
    }
    setTrackedProperties(trackedProperties);
    // TODO (14427339): Setting Validation
    // TODO (14427277): Write to Store
  };

  const trackedPropertiesLabel = <SettingLabel labelText={trackedPropertiesTitle} isChild={false} />;

  const trackingSectionProps: SettingSectionProps = {
    id: 'tracking',
    title: trackingTitle,
    settings: [
      {
        settingType: 'SettingTextField',
        settingProp: {
          readOnly,
          value: correlationFromState?.clientTrackingId ?? '',
          customLabel: () => clientTrackingIdLabel,
          onValueChange: (_, newVal) => onClientTrackingIdChange(newVal as string),
        },
        visible: correlation?.isSupported,
      },
      {
        settingType: 'SettingDictionary',
        settingProp: {
          readOnly,
          values: trackedPropertiesFromState,
          onDictionaryChange: (newVal) => onTrackedPropertiesDictionaryValueChanged(newVal as Record<string, string>),
          onTextFieldChange: (_, newVal) => onTrackedPropertiesStringValueChange(newVal as string),
          customLabel: () => trackedPropertiesLabel,
        },
        visible: trackedProperties?.isSupported,
      },
    ],
  };

  return <SettingsSection {...trackingSectionProps} />;
};
