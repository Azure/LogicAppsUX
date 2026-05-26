import { useCallback, useMemo, useState } from 'react';
import { Button, Combobox, Dropdown, Field, Input, Option, Spinner, Text, Textarea } from '@fluentui/react-components';
import type { FoundryAgent } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useFoundryAgentPickerStyles } from './styles';

export interface FoundryAgentPickerProps {
  agents: FoundryAgent[];
  isLoading: boolean;
  error?: Error | null;
  selectedAgentId?: string;
  onAgentSelect: (agent: FoundryAgent) => void;
  disabled?: boolean;
  /** Available models for the create form dropdown */
  models?: Array<{ id: string; name: string }>;
  /** Whether models are loading */
  modelsLoading?: boolean;
  /** Callback to create a new agent. If provided, shows the "+ Create" button */
  onCreateAgent?: (options: { name: string; model: string; instructions?: string }) => Promise<FoundryAgent>;
  /** Whether agent creation is in progress */
  isCreating?: boolean;
}

export const FoundryAgentPicker = ({
  agents,
  isLoading,
  error,
  selectedAgentId,
  onAgentSelect,
  disabled = false,
  models = [],
  modelsLoading = false,
  onCreateAgent,
  isCreating = false,
}: FoundryAgentPickerProps): JSX.Element => {
  const styles = useFoundryAgentPickerStyles();
  const intl = useIntl();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentModel, setNewAgentModel] = useState('');
  const [newAgentInstructions, setNewAgentInstructions] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

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
  const createNewLabel = intl.formatMessage({
    defaultMessage: 'Create new agent',
    id: 'CYqoVk',
    description: 'Button label to create a new Foundry agent',
  });
  const agentNameLabel = intl.formatMessage({
    defaultMessage: 'Agent name',
    id: 's5jHO7',
    description: 'Label for agent name input',
  });
  const agentNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter agent name...',
    id: 'HF4xfS',
    description: 'Placeholder for agent name input',
  });
  const modelLabel = intl.formatMessage({ defaultMessage: 'Model', id: 'ZHM0+8', description: 'Label for AI model field' });
  const selectModelPlaceholder = intl.formatMessage({
    defaultMessage: 'Select a model...',
    id: '3DmVJ2',
    description: 'Placeholder for model dropdown in create form',
  });
  const instructionsLabel = intl.formatMessage({
    defaultMessage: 'Instructions',
    id: 'PvFzkM',
    description: 'Label for agent instructions',
  });
  const instructionsPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter agent instructions...',
    id: 'Pehyf2',
    description: 'Placeholder for instructions textarea',
  });
  const createButtonLabel = intl.formatMessage({
    defaultMessage: 'Create',
    id: 'M4MGQN',
    description: 'Create button label',
  });
  const cancelButtonLabel = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: '0GT0SI',
    description: 'Cancel button label',
  });
  const loadingModelsPlaceholder = intl.formatMessage({
    defaultMessage: 'Loading models...',
    id: '5VhY2X',
    description: 'Placeholder while models load for create form',
  });
  const creatingLabel = intl.formatMessage({
    defaultMessage: 'Creating...',
    id: 'uyBl7u',
    description: 'Button label while a new agent is being created',
  });
  const createFailedLabel = intl.formatMessage({
    defaultMessage: 'Failed to create agent',
    id: 'VKY/eh',
    description: 'Fallback error message when creating a new agent fails',
  });
  const toolsLabel = intl.formatMessage({ defaultMessage: 'Tools', id: 'US0YlH', description: 'Label for agent tools list' });
  const noTools = intl.formatMessage({ defaultMessage: 'None', id: 'an5t/3', description: 'Displayed when agent has no tools' });

  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId), [agents, selectedAgentId]);
  const isCreateFormValid = newAgentName.trim().length > 0 && newAgentModel.length > 0;

  const handleOptionSelect = useCallback(
    (_: unknown, data: { optionValue?: string | undefined }) => {
      const agent = agents.find((a) => a.id === data.optionValue);
      if (agent) {
        onAgentSelect(agent);
      }
    },
    [agents, onAgentSelect]
  );

  const resetCreateForm = useCallback(() => {
    setShowCreateForm(false);
    setNewAgentName('');
    setNewAgentModel('');
    setNewAgentInstructions('');
    setCreateError(null);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    if (!onCreateAgent || !newAgentName.trim() || !newAgentModel) {
      return;
    }

    setCreateError(null);

    try {
      const newAgent = await onCreateAgent({
        name: newAgentName.trim(),
        model: newAgentModel,
        ...(newAgentInstructions.trim() && { instructions: newAgentInstructions.trim() }),
      });

      resetCreateForm();
      onAgentSelect(newAgent);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : createFailedLabel);
    }
  }, [createFailedLabel, newAgentInstructions, newAgentModel, newAgentName, onAgentSelect, onCreateAgent, resetCreateForm]);

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

      {onCreateAgent && !showCreateForm && (
        <button
          className={styles.createButton}
          onClick={() => {
            setCreateError(null);
            setShowCreateForm(true);
          }}
          disabled={disabled}
          type="button"
        >
          + {createNewLabel}
        </button>
      )}

      {showCreateForm && (
        <div className={styles.createForm}>
          <div className={styles.createFormHeader}>
            <Text className={styles.createFormTitle}>{createNewLabel}</Text>
          </div>

          <Field label={agentNameLabel} required size="small">
            <Input
              placeholder={agentNamePlaceholder}
              value={newAgentName}
              onChange={(_, data) => setNewAgentName(data.value)}
              size="small"
              disabled={isCreating}
            />
          </Field>

          <Field label={modelLabel} required size="small">
            <Dropdown
              placeholder={modelsLoading ? loadingModelsPlaceholder : selectModelPlaceholder}
              value={models.find((model) => model.id === newAgentModel)?.name ?? ''}
              selectedOptions={newAgentModel ? [newAgentModel] : []}
              onOptionSelect={(_, data) => setNewAgentModel(data.optionValue ?? '')}
              disabled={isCreating || modelsLoading}
              size="small"
            >
              {models.map((model) => (
                <Option key={model.id} value={model.id} text={model.name}>
                  {model.name}
                </Option>
              ))}
            </Dropdown>
          </Field>

          <Field label={instructionsLabel} size="small">
            <Textarea
              placeholder={instructionsPlaceholder}
              value={newAgentInstructions}
              onChange={(_, data) => setNewAgentInstructions(data.value)}
              resize="vertical"
              size="small"
              disabled={isCreating}
            />
          </Field>

          {createError && <Text className={styles.errorMessage}>{createError}</Text>}

          <div className={styles.buttonRow}>
            <Button
              appearance="primary"
              size="small"
              onClick={handleCreateSubmit}
              disabled={!isCreateFormValid || isCreating}
              icon={isCreating ? <Spinner size="tiny" /> : undefined}
            >
              {isCreating ? creatingLabel : createButtonLabel}
            </Button>
            <Button appearance="subtle" size="small" onClick={resetCreateForm} disabled={isCreating}>
              {cancelButtonLabel}
            </Button>
          </div>
        </div>
      )}

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
