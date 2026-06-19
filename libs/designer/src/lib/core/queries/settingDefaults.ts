import { OperationManifestService, isSettingDefaultsSkippedOperationType } from '@microsoft/logic-apps-shared';
import type { Settings, SettingData } from '../actions/bjsworkflow/settings';
import { getReactQueryClient } from '../ReactQueryProvider';
import Constants from '../../common/constants';

/**
 * Determines whether a key returned by the backend maps to a known, typed setting.
 * The settings object produced by getOperationSettings is the single source of truth
 * for the supported setting surface, so deriving "known" keys from it (rather than a
 * hand-maintained list) keeps the two from drifting as settings are added or removed.
 */
const isKnownSettingKey = (settings: Settings, key: string): boolean => Object.prototype.hasOwnProperty.call(settings, key);

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
 * (connectorId, operationId, workflowKind, supportedSettings) key — so 50 identical HTTP actions
 * during deserialization result in a single POST to the backend.
 * Returns undefined if the host does not implement getSettingDefaults or the call fails.
 */
export const fetchSettingDefaults = async (
  connectorId: string,
  operationId: string,
  supportedSettings: string[],
  workflowKind?: string,
  operationType?: string
): Promise<Record<string, any> | undefined> => {
  const operationManifestService = OperationManifestService();
  if (!operationManifestService.getSettingDefaults || supportedSettings.length === 0) {
    return undefined;
  }

  try {
    return await getReactQueryClient().fetchQuery(
      [
        'settingDefaults',
        connectorId.toLowerCase(),
        operationId.toLowerCase(),
        workflowKind ?? '',
        (operationType ?? '').toLowerCase(),
        [...supportedSettings].sort().join(','),
      ],
      () => operationManifestService.getSettingDefaults!(connectorId, operationId, supportedSettings, workflowKind, operationType)
    );
  } catch {
    return undefined;
  }
};

/**
 * Fetches backend defaults for the operation and merges them into the provided
 * settings in a single step. Returns the settings unchanged when the host does
 * not provide defaults. Callers should prefer this over wiring getSupportedSettingKeys,
 * fetchSettingDefaults, and mergeSettingDefaults together by hand.
 */
export const applySettingDefaults = async (
  settings: Settings,
  connectorId: string,
  operationId: string,
  workflowKind?: string,
  operationType?: string
): Promise<Settings> => {
  // Operation types with no retry policy have nothing to fetch — skip the round trip entirely.
  if (isSettingDefaultsSkippedOperationType(operationType)) {
    return settings;
  }
  const defaults = await fetchSettingDefaults(connectorId, operationId, getSupportedSettingKeys(settings), workflowKind, operationType);
  return defaults ? mergeSettingDefaults(settings, defaults) : settings;
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
  const hostSettings: Record<string, SettingData<unknown>> = { ...merged.hostSettings };

  for (const key of Object.keys(defaults)) {
    const entry = defaults[key];
    const isReadOnly = entry?.readOnly === true;
    const defaultValue = entry?.value;

    if (!isKnownSettingKey(settings, key)) {
      // Unknown key from the API — store as a host-level setting for display
      hostSettings[key] = { isSupported: true, value: defaultValue, readOnly: isReadOnly };
      continue;
    }

    const settingKey = key as keyof Settings;
    const existing = merged[settingKey] as SettingData<unknown> | undefined;
    if (!existing?.isSupported) {
      continue;
    }

    if (isReadOnly) {
      (merged as Record<string, unknown>)[settingKey] = { ...existing, value: defaultValue, readOnly: true };
    } else if (settingKey === 'retryPolicy' && isDefaultRetryPolicy(existing.value)) {
      (merged as Record<string, unknown>)[settingKey] = { ...existing, value: defaultValue, defaultHint: defaultValue };
    } else if (existing.value === undefined || existing.value === null) {
      (merged as Record<string, unknown>)[settingKey] = { ...existing, value: defaultValue };
    }
  }

  if (Object.keys(hostSettings).length > 0) {
    merged.hostSettings = hostSettings;
  }

  return merged;
};

const isDefaultRetryPolicy = (value: unknown): boolean => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: string }).type === Constants.RETRY_POLICY_TYPE.DEFAULT
  );
};
