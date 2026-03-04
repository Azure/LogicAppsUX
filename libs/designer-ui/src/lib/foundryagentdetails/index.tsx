import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dropdown, Field, Option, Text, Textarea } from '@fluentui/react-components';
import type { FoundryAgent, FoundryModel } from '@microsoft/logic-apps-shared';
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
}

/**
 * Builds the Foundry Portal URL for editing an agent.
 * Pattern: https://ai.azure.com/nextgen/r/{subscriptionId},{resourceGroup},,{account},{project}/build/agents/{agentId}/build?version=2
 */
export function buildFoundryPortalUrl(projectResourceId: string | undefined, agentId: string): string | undefined {
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
  return `https://ai.azure.com/nextgen/r/${encodeURIComponent(subscriptionId)},${encodeURIComponent(resourceGroup)},,${encodeURIComponent(account)},${encodeURIComponent(project)}/build/agents/${encodeURIComponent(agentId)}/build?version=2`;
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
}: FoundryAgentDetailsProps) {
  const styles = useFoundryAgentDetailsStyles();
  const intl = useIntl();
  const [localInstructions, setLocalInstructions] = useState<string | undefined>(selectedInstructions);

  // Reset local instructions when switching agents
  useEffect(() => {
    setLocalInstructions(undefined);
  }, [agent.id]);

  const versionLabel = intl.formatMessage({ defaultMessage: 'Version', id: 'vnlEv2', description: 'Label for Foundry agent version' });
  const versionValue = intl.formatMessage({ defaultMessage: 'Agents (v2)', id: 'hbwavm', description: 'Foundry agents version display' });
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

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Text className={styles.label}>{versionLabel}</Text>
        <Text>{versionValue}</Text>
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
