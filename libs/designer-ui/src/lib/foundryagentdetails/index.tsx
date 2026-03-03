import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dropdown, Field, Link, Option, Text, Textarea } from '@fluentui/react-components';
import { bundleIcon, Open12Regular, Open12Filled } from '@fluentui/react-icons';
import type { FoundryAgent, FoundryModel } from '@microsoft/logic-apps-shared';
import { useFoundryAgentDetailsStyles } from './styles';
import { useIntl } from 'react-intl';

const NavigateIcon = bundleIcon(Open12Regular, Open12Filled);

export interface FoundryAgentDetailsProps {
  agent: FoundryAgent;
  models: FoundryModel[];
  modelsLoading?: boolean;
  /** Override the displayed model (e.g. when the user picks a new one before save). */
  selectedModel?: string;
  onModelChange: (modelId: string) => void;
  onInstructionsChange: (instructions: string) => void;
  projectResourceId?: string;
  disabled?: boolean;
}

/**
 * Builds the Foundry Portal URL for editing an agent.
 * Pattern: https://ai.azure.com/nextgen/r/{subscriptionId},{resourceGroup},,{account},{project}/build/agents/{agentId}/build?version=2
 */
function buildFoundryPortalUrl(projectResourceId: string | undefined, agentId: string): string | undefined {
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
  onModelChange,
  onInstructionsChange,
  projectResourceId,
  disabled = false,
}: FoundryAgentDetailsProps) {
  const styles = useFoundryAgentDetailsStyles();
  const intl = useIntl();
  const [localInstructions, setLocalInstructions] = useState<string | undefined>(undefined);

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
  const toolsLabel = intl.formatMessage({ defaultMessage: 'Tools', id: 'US0YlH', description: 'Label for agent tools list' });
  const noTools = intl.formatMessage({ defaultMessage: 'None', id: 'an5t/3', description: 'Displayed when agent has no tools' });
  const editInPortal = intl.formatMessage({
    defaultMessage: 'Edit in Foundry Portal',
    id: 'Cz5vTr',
    description: 'Link to edit agent in Foundry Portal',
  });

  const portalUrl = useMemo(() => buildFoundryPortalUrl(projectResourceId, agent.id), [projectResourceId, agent.id]);

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

  const toolsSummary = useMemo(() => {
    if (agent.tools.length === 0) {
      return noTools;
    }
    return agent.tools.map((t) => t.type).join(', ');
  }, [agent.tools, noTools]);

  const effectiveModel = selectedModel ?? agent.model;

  const resolvedModel = useMemo(() => {
    const found = models.find((m) => m.id === effectiveModel || m.id.startsWith(effectiveModel));
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

      <div className={styles.row}>
        <Text className={styles.label}>{toolsLabel}</Text>
        <Text className={styles.toolsList}>{toolsSummary}</Text>
      </div>

      {portalUrl && (
        <Link className={styles.portalLink} href={portalUrl} target="_blank" rel="noopener noreferrer">
          <NavigateIcon />
          {editInPortal}
        </Link>
      )}
    </div>
  );
}
