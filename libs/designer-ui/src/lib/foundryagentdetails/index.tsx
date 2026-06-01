import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dropdown, Field, Option, Text, Textarea } from '@fluentui/react-components';
import type { FoundryAgent, FoundryAgentVersion, FoundryModel } from '@microsoft/logic-apps-shared';
import { useFoundryAgentDetailsStyles } from './styles';
import { useIntl } from 'react-intl';

export { useFoundryAgentDetailsStyles } from './styles';

export interface FoundryAgentDetailsProps {
  agent: FoundryAgent;
  models: FoundryModel[];
  modelsLoading?: boolean;
  /** Override the displayed model (e.g. when the user picks a new one before save). */
  selectedModel?: string;
  /** Override the displayed instructions (e.g. restored from pending edits). */
  selectedInstructions?: string;
  onModelChange: (modelId: string) => void;
  onInstructionsChange: (instructions: string) => void;
  disabled?: boolean;
  /** Available versions of the agent (newest first). */
  versions?: FoundryAgentVersion[];
  /** Whether versions are still loading. */
  versionsLoading?: boolean;
  /** The currently selected version number (e.g. "6"). */
  selectedVersion?: string;
  /** Called when user picks a different version from the dropdown. */
  onVersionChange?: (version: FoundryAgentVersion) => void;
}

/**
 * Converts a GUID string (e.g. "11e43792-2b16-4f94-...") to base64url by
 * treating the hex digits as raw bytes. The Foundry portal expects this
 * encoding for the subscription segment of the URL.
 * Falls back to the raw value if the input is not a valid GUID.
 */
export function guidToBase64Url(guid: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid)) {
    return guid;
  }
  const hex = guid.replace(/-/g, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds the Foundry Portal URL for editing an agent.
 * When versionNumber is provided, appends ?version={N}. Otherwise opens the latest.
 */
export function buildFoundryPortalUrl(projectResourceId: string | undefined, agentId: string, versionNumber?: string): string | undefined {
  if (!projectResourceId) {
    return undefined;
  }
  const match = projectResourceId.match(
    /\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.CognitiveServices\/accounts\/([^/]+)\/projects\/([^/]+)/i
  );
  if (!match) {
    return undefined;
  }
  const [, subscriptionId, resourceGroup, account, project] = match;
  const encodedSubscriptionId = encodeURIComponent(guidToBase64Url(subscriptionId));
  const baseUrl = `https://ai.azure.com/nextgen/r/${encodedSubscriptionId},${encodeURIComponent(resourceGroup)},,${encodeURIComponent(account)},${encodeURIComponent(project)}/build/agents/${encodeURIComponent(agentId)}/build`;
  return versionNumber ? `${baseUrl}?version=${encodeURIComponent(versionNumber)}` : baseUrl;
}

export function FoundryAgentDetails({
  agent,
  models,
  modelsLoading = false,
  selectedModel,
  selectedInstructions,
  onModelChange,
  onInstructionsChange,
  disabled = false,
  versions,
  versionsLoading = false,
  selectedVersion,
  onVersionChange,
}: FoundryAgentDetailsProps) {
  const styles = useFoundryAgentDetailsStyles();
  const intl = useIntl();
  const [localInstructions, setLocalInstructions] = useState<string | undefined>(selectedInstructions);

  // Sync local instructions when the parent overrides them (e.g. version switch or restored pending edits)
  useEffect(() => {
    if (selectedInstructions !== undefined) {
      setLocalInstructions(selectedInstructions);
    }
  }, [selectedInstructions]);

  // Reset local instructions when switching agents (not on initial mount — the parent
  // already provides the correct value via selectedInstructions on first render).
  const prevAgentIdRef = useRef(agent.id);
  useEffect(() => {
    if (prevAgentIdRef.current !== agent.id) {
      prevAgentIdRef.current = agent.id;
      setLocalInstructions(undefined);
    }
  }, [agent.id]);

  const versionLabel = intl.formatMessage({ defaultMessage: 'Version', id: 'vnlEv2', description: 'Label for Foundry agent version' });
  const selectVersionPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a version',
    id: 'urJyNX',
    description: 'Placeholder for version dropdown',
  });
  const loadingVersionsPlaceholder = intl.formatMessage({
    defaultMessage: 'Loading versions...',
    id: 'ld530c',
    description: 'Placeholder while agent versions load',
  });
  const modelLabel = intl.formatMessage({ defaultMessage: 'Model', id: 'ZHM0+8', description: 'Label for AI model field' });
  const selectModelPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a model',
    id: 'merl0X',
    description: 'Placeholder for model dropdown',
  });
  const loadingModelsPlaceholder = intl.formatMessage({
    defaultMessage: 'Loading models...',
    id: 'kiNXnD',
    description: 'Placeholder while models load',
  });
  const instructionsLabel = intl.formatMessage({
    defaultMessage: 'Instructions',
    id: 'PvFzkM',
    description: 'Label for agent instructions',
  });

  const hasVersions = versions && versions.length > 0;

  const handleVersionSelect = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue && onVersionChange && versions) {
        const version = versions.find((v) => String(v.version) === data.optionValue);
        if (version) {
          onVersionChange(version);
        }
      }
    },
    [onVersionChange, versions]
  );

  const handleModelSelect = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue) {
        onModelChange(data.optionValue);
      }
    },
    [onModelChange]
  );

  const handleInstructionsChange = useCallback(
    (ev: ChangeEvent<HTMLTextAreaElement>) => {
      const value = ev.target.value;
      setLocalInstructions(value);
      onInstructionsChange(value);
    },
    [onInstructionsChange]
  );

  const effectiveModel = selectedModel ?? agent.model;

  const resolvedModel = useMemo(() => {
    const found = effectiveModel ? models.find((m) => m.id === effectiveModel || m.id.startsWith(effectiveModel)) : undefined;
    return {
      id: found?.id ?? effectiveModel,
      displayName: found?.name ?? effectiveModel ?? '',
    };
  }, [models, effectiveModel]);

  const versionDisplayValue = selectedVersion ? `Version ${selectedVersion}` : '';
  const versionPlaceholder = versionsLoading ? loadingVersionsPlaceholder : selectVersionPlaceholder;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Field label={versionLabel} size="small">
          {hasVersions ? (
            <Dropdown
              placeholder={versionPlaceholder}
              value={versionDisplayValue}
              selectedOptions={selectedVersion ? [selectedVersion] : []}
              onOptionSelect={handleVersionSelect}
              disabled={disabled || versionsLoading}
              size="small"
            >
              {versions.map((v) => (
                <Option key={String(v.version)} value={String(v.version)} text={`Version ${v.version}`}>
                  {`Version ${v.version}`}
                </Option>
              ))}
            </Dropdown>
          ) : (
            <Dropdown placeholder={versionPlaceholder} value="" selectedOptions={[]} disabled size="small" />
          )}
        </Field>
      </div>

      <div className={styles.row}>
        <Field label={modelLabel} size="small">
          <Dropdown
            placeholder={modelsLoading ? loadingModelsPlaceholder : selectModelPlaceholder}
            value={resolvedModel.displayName}
            selectedOptions={resolvedModel.id ? [resolvedModel.id] : []}
            onOptionSelect={handleModelSelect}
            disabled={disabled || modelsLoading}
            size="small"
          >
            {models.map((model) => (
              <Option key={model.id} value={model.id} text={model.name}>
                {model.name}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      <div className={styles.row}>
        <Text className={styles.label}>{instructionsLabel}</Text>
        <Textarea
          className={styles.instructionsTextarea}
          key={agent.id}
          value={localInstructions ?? agent.instructions ?? ''}
          onChange={handleInstructionsChange}
          disabled={disabled}
          resize="vertical"
          size="small"
        />
      </div>
    </div>
  );
}
