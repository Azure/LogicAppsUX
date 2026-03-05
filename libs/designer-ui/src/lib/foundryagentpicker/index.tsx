import { useCallback, useMemo } from 'react';
import { Combobox, Field, Option, Text } from '@fluentui/react-components';
import type { FoundryAgent } from '@microsoft/logic-apps-shared';
import { useFoundryAgentPickerStyles } from './styles';
import { useIntl } from 'react-intl';

export interface FoundryAgentPickerProps {
  agents: FoundryAgent[];
  isLoading: boolean;
  error?: Error | null | undefined;
  selectedAgentId?: string | undefined;
  onAgentSelect: (agent: FoundryAgent) => void;
  disabled?: boolean | undefined;
}

export const FoundryAgentPicker = ({
  agents,
  isLoading,
  error,
  selectedAgentId,
  onAgentSelect,
  disabled = false,
}: FoundryAgentPickerProps) => {
  const styles = useFoundryAgentPickerStyles();
  const intl = useIntl();

  const selectAgentLabel = intl.formatMessage({
    defaultMessage: 'Select agent',
    id: 'UI8nlW',
    description: 'Label for Foundry agent picker field',
  });
  const loadingPlaceholder = intl.formatMessage({
    defaultMessage: 'Loading agents...',
    id: 'ccG02S',
    description: 'Placeholder while agents load',
  });
  const selectPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a Foundry agent...',
    id: 'DmcfFk',
    description: 'Placeholder for agent picker',
  });
  const noAgentsText = intl.formatMessage({
    defaultMessage: 'No agents found in this project',
    id: '7iFZ8E',
    description: 'Empty state for agent picker',
  });
  const modelLabel = intl.formatMessage({ defaultMessage: 'Model', id: 'ZHM0+8', description: 'Label for AI model field' });
  const instructionsLabel = intl.formatMessage({
    defaultMessage: 'Instructions',
    id: 'PvFzkM',
    description: 'Label for agent instructions',
  });
  const toolsLabel = intl.formatMessage({ defaultMessage: 'Tools', id: 'US0YlH', description: 'Label for agent tools list' });
  const noTools = intl.formatMessage({ defaultMessage: 'None', id: 'an5t/3', description: 'Displayed when agent has no tools' });

  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId), [agents, selectedAgentId]);

  const handleOptionSelect = useCallback(
    (_: unknown, data: { optionValue?: string | undefined }) => {
      const agent = agents.find((a) => a.id === data.optionValue);
      if (agent) {
        onAgentSelect(agent);
      }
    },
    [agents, onAgentSelect]
  );

  return (
    <>
      <Field label={selectAgentLabel} required size="small" {...(error && { validationState: 'error', validationMessage: error.message })}>
        <Combobox
          placeholder={isLoading ? loadingPlaceholder : selectPlaceholder}
          value={selectedAgent?.name ?? selectedAgent?.id ?? ''}
          selectedOptions={selectedAgentId ? [selectedAgentId] : []}
          onOptionSelect={handleOptionSelect}
          disabled={disabled || isLoading}
          size="small"
          autoComplete="off"
        >
          {agents.map((agent) => (
            <Option key={agent.id} value={agent.id} text={agent.name ?? agent.id}>
              <div className={styles.agentOption}>
                <div className={styles.agentNameRow}>
                  <Text className={styles.agentName}>{agent.name ?? agent.id}</Text>
                </div>
                <Text className={styles.agentMeta}>
                  {agent.model} · {agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''}
                </Text>
              </div>
            </Option>
          ))}

          {!isLoading && agents.length === 0 && (
            <Option key="__empty__" value="" text="" disabled>
              <Text className={styles.emptyState}>{noAgentsText}</Text>
            </Option>
          )}
        </Combobox>
      </Field>

      {selectedAgent && (
        <div className={styles.selectedInfo}>
          <div className={styles.selectedRow}>
            <Text className={styles.selectedLabel}>{modelLabel}</Text>
            <Text className={styles.selectedValue}>{selectedAgent.model}</Text>
          </div>
          {selectedAgent.instructions && (
            <div className={styles.selectedRow}>
              <Text className={styles.selectedLabel}>{instructionsLabel}</Text>
              <Text className={styles.selectedValue}>
                {selectedAgent.instructions.length > 100
                  ? `${selectedAgent.instructions.substring(0, 100)}...`
                  : selectedAgent.instructions}
              </Text>
            </div>
          )}
          <div className={styles.selectedRow}>
            <Text className={styles.selectedLabel}>{toolsLabel}</Text>
            <Text className={styles.selectedValue}>
              {selectedAgent.tools.length > 0 ? selectedAgent.tools.map((t) => t.type).join(', ') : noTools}
            </Text>
          </div>
        </div>
      )}
    </>
  );
};

FoundryAgentPicker.displayName = 'FoundryAgentPicker';
