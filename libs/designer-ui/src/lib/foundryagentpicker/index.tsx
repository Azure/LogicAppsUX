import { useCallback, useMemo } from 'react';
import { Combobox, Field, Option, Text } from '@fluentui/react-components';
import type { FoundryAgent } from '@microsoft/logic-apps-shared';
import { useFoundryAgentPickerStyles } from './styles';

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

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId || a.name === selectedAgentId),
    [agents, selectedAgentId]
  );

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
      <Field label="Select agent" required size="small" {...(error && { validationState: 'error', validationMessage: error.message })}>
        <Combobox
          placeholder={isLoading ? 'Loading agents...' : 'Select a Foundry agent...'}
          value={selectedAgent?.name ?? ''}
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
              <Text className={styles.emptyState}>No agents found in this project</Text>
            </Option>
          )}
        </Combobox>
      </Field>

      {selectedAgent && (
        <div className={styles.selectedInfo}>
          <div className={styles.selectedRow}>
            <Text className={styles.selectedLabel}>Model</Text>
            <Text className={styles.selectedValue}>{selectedAgent.model}</Text>
          </div>
          {selectedAgent.instructions && (
            <div className={styles.selectedRow}>
              <Text className={styles.selectedLabel}>Instructions</Text>
              <Text className={styles.selectedValue}>
                {selectedAgent.instructions.length > 100
                  ? `${selectedAgent.instructions.substring(0, 100)}...`
                  : selectedAgent.instructions}
              </Text>
            </div>
          )}
          <div className={styles.selectedRow}>
            <Text className={styles.selectedLabel}>Tools</Text>
            <Text className={styles.selectedValue}>
              {selectedAgent.tools.length > 0 ? selectedAgent.tools.map((t) => t.type).join(', ') : 'None'}
            </Text>
          </div>
        </div>
      )}
    </>
  );
};

FoundryAgentPicker.displayName = 'FoundryAgentPicker';
