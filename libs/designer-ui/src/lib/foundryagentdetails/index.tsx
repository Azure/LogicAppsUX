import { useCallback, useMemo } from 'react';
import { Dropdown, Field, Link, Option, Text, Textarea } from '@fluentui/react-components';
import { bundleIcon, Open12Regular, Open12Filled } from '@fluentui/react-icons';
import type { FoundryAgent, FoundryModel } from '@microsoft/logic-apps-shared';
import { useFoundryAgentDetailsStyles } from './styles';

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
  return `https://ai.azure.com/nextgen/r/${subscriptionId},${resourceGroup},,${account},${project}/build/agents/${encodeURIComponent(agentId)}/build?version=2`;
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

  const portalUrl = useMemo(() => buildFoundryPortalUrl(projectResourceId, agent.id), [projectResourceId, agent.id]);

  const handleModelSelect = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue) {
        onModelChange(data.optionValue);
      }
    },
    [onModelChange]
  );

  const handleInstructionsBlur = useCallback(
    (ev: React.FocusEvent<HTMLTextAreaElement>) => {
      onInstructionsChange(ev.target.value);
    },
    [onInstructionsChange]
  );

  const toolsSummary = useMemo(() => {
    if (agent.tools.length === 0) {
      return 'None';
    }
    return agent.tools.map((t) => t.type).join(', ');
  }, [agent.tools]);

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
        <Text className={styles.label}>Version</Text>
        <Text>Agents (v2)</Text>
      </div>

      <div className={styles.row}>
        <Field label="Model" size="small">
          <Dropdown
            placeholder={modelsLoading ? 'Loading models...' : 'Select a model'}
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
          <Text className={styles.label}>Instructions</Text>
          <Text className={styles.badge}>Defined in Foundry</Text>
        </div>
        <Textarea
          className={styles.instructionsTextarea}
          key={agent.id}
          defaultValue={agent.instructions ?? ''}
          onBlur={handleInstructionsBlur}
          disabled={disabled}
          resize="vertical"
          size="small"
        />
      </div>

      <div className={styles.row}>
        <Text className={styles.label}>Tools</Text>
        <Text className={styles.toolsList}>{toolsSummary}</Text>
      </div>

      {portalUrl && (
        <Link className={styles.portalLink} href={portalUrl} target="_blank" rel="noopener noreferrer">
          <NavigateIcon />
          Edit in Foundry Portal
        </Link>
      )}
    </div>
  );
}
