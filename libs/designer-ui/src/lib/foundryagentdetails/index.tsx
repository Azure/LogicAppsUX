import { useCallback, useEffect, useMemo, useState } from 'react';
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
 * Builds the Foundry Portal URL for editing an agent.
 * Pattern: https://ai.azure.com/nextgen/r/{subscriptionId},{resourceGroup},,{account},{project}/build/agents/{agentId}/build?version=2
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
  const version = versionNumber ?? '2';
  return `https://ai.azure.com/nextgen/r/${encodeURIComponent(subscriptionId)},${encodeURIComponent(resourceGroup)},,${encodeURIComponent(account)},${encodeURIComponent(project)}/build/agents/${encodeURIComponent(agentId)}/build?version=${encodeURIComponent(version)}`;
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

  // Sync local instructions when the parent overrides them (e.g. version switch)
  useEffect(() => {
    if (selectedInstructions !== undefined) {
      setLocalInstructions(selectedInstructions);
    }
  }, [selectedInstructions]);

  // Reset local instructions when switching agents
  useEffect(() => {
    setLocalInstructions(undefined);
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
  const definedInFoundry = intl.formatMessage({
    defaultMessage: 'Defined in Foundry',
    id: 'fZbvAd',
    description: 'Badge indicating instructions are from Foundry',
  });

  const hasVersions = versions && versions.length > 0;

  const handleVersionSelect = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue && onVersionChange && versions) {
        const version = versions.find((v) => v.version === data.optionValue);
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

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Field label={versionLabel} size="small">
          {hasVersions ? (
            <Dropdown
              placeholder={versionsLoading ? loadingVersionsPlaceholder : selectVersionPlaceholder}
              value={versionDisplayValue}
              selectedOptions={selectedVersion ? [selectedVersion] : []}
              onOptionSelect={handleVersionSelect}
              disabled={disabled || versionsLoading}
              size="small"
            >
              {versions.map((v) => (
                <Option key={v.version} value={v.version} text={`Version ${v.version}`}>
                  {`Version ${v.version}`}
                </Option>
              ))}
            </Dropdown>
          ) : (
            <Dropdown
              placeholder={versionsLoading ? loadingVersionsPlaceholder : selectVersionPlaceholder}
              value=""
              selectedOptions={[]}
              disabled
              size="small"
            />
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
        <div className={styles.labelRow}>
          <Text className={styles.label}>{instructionsLabel}</Text>
          <Text className={styles.badge}>{definedInFoundry}</Text>
        </div>
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
