import type { SectionProps, TextChangeHandler } from '..';
import { SettingSectionName } from '..';
import type { SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

type DictionaryRecordChangeHandler = (newVal: Record<string, string>) => void;
export interface TrackingSectionProps extends SectionProps {
  onClientTrackingIdChange: TextChangeHandler;
  onTrackedPropertiesDictionaryValueChanged: DictionaryRecordChangeHandler;
  onTrackedPropertiesStringValueChange: TextChangeHandler;
}

export const Tracking = ({
  readOnly,
  expanded,
  correlation,
  trackedProperties,
  validationErrors,
  onHeaderClick,
  onClientTrackingIdChange,
  onTrackedPropertiesDictionaryValueChanged,
  onTrackedPropertiesStringValueChange,
}: TrackingSectionProps): JSX.Element | null => {
  const intl = useIntl();

  const trackedPropertiesTitle = intl.formatMessage({
    defaultMessage: 'Tracked properties',
    id: 'Pk4cb+',
    description: 'title for tracked properties setting',
  });

  const clientIdTrackingTitle = intl.formatMessage({
    defaultMessage: 'Custom Tracking Id',
    id: 'SmCQys',
    description: 'title for client tracking id setting',
  });
  const clientTrackingTootltipText = intl.formatMessage({
    defaultMessage: 'Set the tracking id for the run. For split-on this tracking id is for the initiating request',
    id: 'BvCnOv',
    description: 'description for client tracking id setting',
  });
  const trackingTitle = intl.formatMessage({
    defaultMessage: 'Tracking',
    id: '0KMjv6',
    description: 'title for tracking component',
  });

  const onTrackedPropertiesChangeCallback = useCallback(
    (newVal: Record<string, string>) => onTrackedPropertiesDictionaryValueChanged(newVal),
    [onTrackedPropertiesDictionaryValueChanged]
  );

  const onTrackedPropertiesStringValueChanged = useCallback(
    (newVal: string) => onTrackedPropertiesStringValueChange(newVal),
    [onTrackedPropertiesStringValueChange]
  );

  const onClientTrackingIdChangeCallback = useCallback(
    (_: unknown, newVal: string) => onClientTrackingIdChange(newVal),
    [onClientTrackingIdChange]
  );

  const trackingSectionProps: SettingsSectionProps = {
    id: 'tracking',
    title: trackingTitle,
    sectionName: SettingSectionName.TRACKING,
    expanded,
    isReadOnly: readOnly,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingTextField',
        settingProp: {
          readOnly,
          value: (correlation?.value?.clientTrackingId ?? '') as any,
          onValueChange: onClientTrackingIdChangeCallback as any,
          customLabel: getSettingLabel(clientIdTrackingTitle, clientTrackingTootltipText),
          ariaLabel: clientIdTrackingTitle,
        },
        visible: correlation?.isSupported,
      },
      {
        settingType: 'SettingDictionary',
        settingProp: {
          readOnly,
          values: trackedProperties?.value,
          onDictionaryChange: onTrackedPropertiesChangeCallback as any,
          onTextFieldChange: onTrackedPropertiesStringValueChanged as any,
          customLabel: getSettingLabel(trackedPropertiesTitle),
          ariaLabel: trackedPropertiesTitle,
        },
        visible: trackedProperties?.isSupported,
      },
    ],
    validationErrors,
  };

  return <SettingsSection {...trackingSectionProps} />;
};
