import { OperationManifestService } from '@microsoft/logic-apps-shared';
import type { Settings, SettingData } from '../actions/bjsworkflow/settings';
import { getReactQueryClient } from '../ReactQueryProvider';

/**
 * Extracts the list of setting keys that have isSupported === true.
 */
export const getSupportedSettingKeys = (settings: Settings): string[] => {
  return Object.entries(settings)
    .filter(([, value]) => typeof value === 'object' && value !== null && 'isSupported' in value && value.isSupported)
    .map(([key]) => key);
};

/**
 * Fetches default setting values from the backend for the given operation.
 * Uses React Query to deduplicate concurrent requests with the same
 * (connectorId, operationId, workflowKind) key — so 50 identical HTTP actions
 * during deserialization result in a single POST to the backend.
 * Returns undefined if the host does not implement getSettingDefaults or the call fails.
 */
export const fetchSettingDefaults = async (
  connectorId: string,
  operationId: string,
  supportedSettings: string[],
  workflowKind?: string
): Promise<Record<string, any> | undefined> => {
  const service = OperationManifestService();
  if (!service.getSettingDefaults || supportedSettings.length === 0) {
    return undefined;
  }

  try {
    return await getReactQueryClient().fetchQuery(
      ['settingDefaults', connectorId.toLowerCase(), operationId.toLowerCase(), workflowKind ?? ''],
      () => service.getSettingDefaults!(connectorId, operationId, supportedSettings, workflowKind)
    );
  } catch {
    return undefined;
  }
};

/**
 * Merges backend defaults into settings, only applying where the setting
 * is supported. Read-only settings are always applied and locked.
 * Editable defaults are only applied when the user hasn't already set a value.
 *
 * The API response uses a uniform shape per setting:
 *   { value: any, readOnly: boolean }
 */
export const mergeSettingDefaults = (settings: Settings, defaults: Record<string, any>): Settings => {
  const merged = { ...settings };
  for (const key of Object.keys(defaults)) {
    const settingKey = key as keyof Settings;
    const existing = merged[settingKey] as SettingData<unknown> | undefined;
    if (!existing?.isSupported) {
      continue;
    }

    const entry = defaults[key];
    const isReadOnly = entry?.readOnly === true;
    const defaultValue = entry?.value;

    if (isReadOnly) {
      (merged as Record<string, unknown>)[settingKey] = { ...existing, value: defaultValue, readOnly: true };
    } else if (existing.value === undefined || existing.value === null) {
      (merged as Record<string, unknown>)[settingKey] = { ...existing, value: defaultValue };
    }
  }
  return merged;
};
