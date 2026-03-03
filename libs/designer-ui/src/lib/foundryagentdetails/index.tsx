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
  // Extract parts from ARM resource ID:
  // /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}
  const match = projectResourceId.match(
    /\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.CognitiveServices\/accounts\/([^/]+)\/projects\/([^/]+)/i
  );
  if (!match) {
    return undefined;
  }
  const [, subscriptionId, resourceGroup, account, project] = match;
  return `https://ai.azure.com/nextgen/r/${subscriptionId},${resourceGroup},,${account},${project}/build/agents/${encodeURIComponent(agentId)}/build?version=2`;
}

export const FoundryAgentDetails = ({
  agent,
  models,
  modelsLoading = false,
  onModelChange,
  onInstructionsChange,
  projectResourceId,
  disabled = false,
}: FoundryAgentDetailsProps) => {
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

  const currentModelId = useMemo(() => {
    const found = models.find((m) => m.id === agent.model || m.id.startsWith(agent.model));
    return found?.id ?? agent.model;
  }, [models, agent.model]);

  return (
    <div className={styles.container}>
      {/* Version */}
      <div className={styles.row}>
        <Text className={styles.label}>Version</Text>
        <Text>Agents (v2)</Text>
      </div>

      {/* Model dropdown */}
      <div className={styles.row}>
        <Field label="Model" size="small">
          <Dropdown
            placeholder={modelsLoading ? 'Loading models...' : 'Select a model'}
            value={agent.model || ''}
            selectedOptions={currentModelId ? [currentModelId] : []}
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

      {/* Instructions */}
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

      {/* Tools */}
      <div className={styles.row}>
        <Text className={styles.label}>Tools</Text>
        <Text className={styles.toolsList}>{toolsSummary}</Text>
      </div>

      {/* Edit in Foundry Portal link */}
      {portalUrl && (
        <Link className={styles.portalLink} href={portalUrl} target="_blank" rel="noopener noreferrer">
          <NavigateIcon />
          Edit in Foundry Portal
        </Link>
      )}
    </div>
  );
};

FoundryAgentDetails.displayName = 'FoundryAgentDetails';
