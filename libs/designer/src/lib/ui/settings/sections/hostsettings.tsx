import type { HeaderClickHandler } from '..';
import { SettingSectionName } from '..';
import { SettingsSection } from '../settingsection';
import type { SettingsSectionProps, Settings as SettingEntry } from '../settingsection';
import type { SettingData } from '../../../core/actions/bjsworkflow/settings';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface HostSettingsSectionProps {
  nodeId: string;
  expanded: boolean;
  hostSettings: Record<string, SettingData<unknown>>;
  onHeaderClick?: HeaderClickHandler;
}

const formatSettingName = (key: string): string => {
  // Convert camelCase to Title Case with spaces
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const formatSettingValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const HostSettings = ({ nodeId, expanded, hostSettings, onHeaderClick }: HostSettingsSectionProps): JSX.Element | null => {
  const intl = useIntl();

  const title = intl.formatMessage({
    defaultMessage: 'Host settings',
    id: 'xhrvz3',
    description: 'Title for host-level read-only settings section',
  });

  const settings: SettingEntry[] = Object.entries(hostSettings).map(([key, data]) => ({
    settingType: 'SettingTextField' as const,
    settingProp: {
      readOnly: true,
      value: formatSettingValue(data.value),
      customLabel: getSettingLabel(formatSettingName(key)),
      ariaLabel: formatSettingName(key),
    },
    visible: true,
  }));

  if (settings.length === 0) {
    return null;
  }

  const sectionProps: SettingsSectionProps = {
    id: 'hostSettings',
    nodeId,
    title,
    sectionName: SettingSectionName.HOSTSETTINGS,
    expanded,
    onHeaderClick,
    settings,
  };

  return <SettingsSection {...sectionProps} />;
};
