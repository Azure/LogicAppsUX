import type { SectionProps } from '..';
import { isObject } from '@microsoft-logic-apps/utils';
import type { SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';
import { useState } from 'react';

export const Tracking = ({ readOnly, /*nodeId*/ correlation /*trackedProperties*/ }: SectionProps): JSX.Element | null => {
  const sampleTP = {
    dog: 'cat',
    cat: 'dog',
    some: 'else',
  };
  const [correlationFromState, setCorrelation] = useState(correlation);
  const [trackedPropertiesFromState, setTrackedProperties] = useState(sampleTP as any /*trackedProperties*/);

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

  const onTrackedPropertiesDictionaryValueChanged = (newValue: Record<string, string>): void => {
    // runs on key AND value change.
    // check that it is last key.
    // when the value of the last key first changes, add another key, value pair to tracked properties
    let trackedProperties: Record<string, any> = {}; // tslint:disable-line: no-any
    console.log(isObject([]));
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
    // this.context.designerContext.SettingActions.updateNodeSettings(this.props.nodeId, { trackedProperties });
    // this.forceUpdate(); // TODO (afowose) subscribe to setting store changes, save settings to local state, and render using those.
  };

  const trackedPropertiesLabel = <SettingLabel labelText="Tracked Properties" isChild={false} />;

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
      {
        settingType: 'SettingDictionary',
        settingProp: {
          readOnly,
          visible: true,
          values: trackedPropertiesFromState,
          onDictionaryChange: (newVal) => onTrackedPropertiesDictionaryValueChanged(newVal as Record<string, string>),
          onTextFieldChange: (_, newVal) => onTrackedPropertiesStringValueChange(newVal as string),
          customLabel: () => trackedPropertiesLabel,
        },
      },
    ],
  };

  return <SettingsSection {...trackingSectionProps} />;
};
