import type { SectionProps, TextChangeHandler } from '..';
import constants from '../../../common/constants';
import type { SettingSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { useIntl } from 'react-intl';

type DictionaryRecordChangeHandler = (newVal: Record<string, string>) => void;
export interface TrackingSectionProps extends SectionProps {
  onClientTrackingIdChange: TextChangeHandler;
  onTrackedPropertiesDictionaryValueChanged: DictionaryRecordChangeHandler;
  onTrackedPropertiesStringValueChange: TextChangeHandler;
}

export const Tracking = ({
  readOnly,
  correlation,
  expanded,
  onHeaderClick,
  trackedProperties,
  onClientTrackingIdChange,
  onTrackedPropertiesDictionaryValueChanged,
  onTrackedPropertiesStringValueChange,
}: TrackingSectionProps): JSX.Element | null => {
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

  const trackedPropertiesLabel = <SettingLabel labelText={trackedPropertiesTitle} isChild={false} />;

  const trackingSectionProps: SettingSectionProps = {
    id: 'tracking',
    title: trackingTitle,
    sectionName: constants.SETTINGSECTIONS.TRACKING,
    expanded,
    onHeaderClick,
    settings: [
      {
        settingType: 'SettingTextField',
        settingProp: {
          readOnly,
          value: correlation?.value?.clientTrackingId ?? '',
          customLabel: () => clientTrackingIdLabel,
          onValueChange: (_, newVal) => onClientTrackingIdChange(newVal as string),
        },
        visible: correlation?.isSupported,
      },
      {
        settingType: 'SettingDictionary',
        settingProp: {
          readOnly,
          values: trackedProperties?.value,
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
