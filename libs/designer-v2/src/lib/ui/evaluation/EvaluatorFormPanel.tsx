import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Caption1,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Checkbox,
  Textarea,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { DeleteRegular, AddRegular, SaveRegular, DismissRegular } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import { finishFormAction, cancelFormAction } from '../../core/state/evaluation/evaluationSlice';
import {
  useSelectedEvaluator,
  useEvaluationViewMode,
  useSelectedEvaluationAgentName,
  useEvaluationDataSelected,
} from '../../core/state/evaluation/evaluationSelectors';
import { useCreateOrUpdateEvaluator, useEvaluators } from '../../core/queries/evaluations';
import type { EvaluatorTemplate, ComparisonMethod } from '@microsoft/logic-apps-shared';
import type { EvaluatorFormData } from './evaluatorFormHelpers';
import {
  createDefaultEvaluatorFormData,
  evaluatorToFormData,
  formDataToEvaluator,
  createDefaultToolCallFormItem,
} from './evaluatorFormHelpers';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { EvaluationViewMode } from '../../core/state/evaluation/evaluationInterfaces';

interface EvaluatorFormPanelProps {
  workflowName: string;
}

export const EvaluatorFormPanel = ({ workflowName }: EvaluatorFormPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const viewMode = useEvaluationViewMode();
  const selectedEvaluator = useSelectedEvaluator();
  const selectedAgentName = useSelectedEvaluationAgentName();
  const isEvaluationDataSelected = useEvaluationDataSelected();
  const { mutateAsync: createOrUpdateEvaluator, isLoading: isModifyingEvaluator } = useCreateOrUpdateEvaluator(
    workflowName,
    selectedAgentName ?? ''
  );
  const { data: evaluators } = useEvaluators(workflowName, selectedAgentName ?? '');
  const existingEvaluatorNames = useMemo(() => new Set((evaluators ?? []).map((e) => e.name.toLowerCase())), [evaluators]);

  const [formData, setFormData] = useState<EvaluatorFormData>(createDefaultEvaluatorFormData());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (viewMode === EvaluationViewMode.EditEvaluator && selectedEvaluator) {
      setFormData(evaluatorToFormData(selectedEvaluator));
    } else {
      setFormData(createDefaultEvaluatorFormData());
    }
  }, [viewMode, selectedEvaluator]);

  const updateFormField = useCallback(<K extends keyof EvaluatorFormData>(field: K, value: EvaluatorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Evaluator name is required');
      return;
    }

    if (viewMode === EvaluationViewMode.CreateEvaluator && existingEvaluatorNames.has(formData.name.trim().toLowerCase())) {
      setError('An evaluator with this name already exists');
      return;
    }

    setError(null);
    try {
      const evalData = formDataToEvaluator(formData);
      await createOrUpdateEvaluator({ evaluatorName: formData.name, evaluator: evalData });
      dispatch(finishFormAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evaluator');
    }
  }, [formData, createOrUpdateEvaluator, dispatch, viewMode, existingEvaluatorNames]);

  return (
    <div className={styles.panelRoot}>
      <div className={styles.panelHeader}>
        <div>
          <Text size={400} weight="semibold" as="h2">
            {viewMode === EvaluationViewMode.CreateEvaluator ? 'Create Evaluator' : 'Edit Evaluator'}
          </Text>
          <Caption1 block className={styles.panelSubtitle}>
            {viewMode === EvaluationViewMode.CreateEvaluator
              ? 'Configure a new evaluator for your agent'
              : 'Update evaluator configuration'}
          </Caption1>
        </div>
      </div>

      {error && (
        <MessageBar intent="error" style={{ margin: '0 16px' }}>
          <MessageBarBody>{error}</MessageBarBody>
          <MessageBarActions
            containerAction={<Button appearance="subtle" size="small" icon={<DismissRegular />} onClick={() => setError(null)} />}
          />
        </MessageBar>
      )}

      <div className={styles.formContent}>
        <Field label="Name" required>
          <Input
            id="evaluator-name"
            value={formData.name}
            onChange={(_e, data) => updateFormField('name', data.value)}
            placeholder="Enter evaluator name"
            disabled={viewMode === EvaluationViewMode.EditEvaluator}
          />
        </Field>

        <Field label="Template">
          <Dropdown
            id="evaluator-template"
            value={
              formData.template === 'CustomPrompt'
                ? 'Custom Prompt'
                : formData.template === 'ToolCallTrajectory'
                  ? 'Tool Call Trajectory'
                  : 'Semantic Similarity'
            }
            selectedOptions={[formData.template]}
            onOptionSelect={(_e, data) => updateFormField('template', data.optionValue as EvaluatorTemplate)}
          >
            <Option value="CustomPrompt">Custom Prompt</Option>
            <Option value="ToolCallTrajectory">Tool Call Trajectory</Option>
            <Option value="SemanticSimilarity">Semantic Similarity</Option>
          </Dropdown>
        </Field>

        {/* Model configuration - not needed for ToolCallTrajectory */}
        {formData.template !== 'ToolCallTrajectory' && (
          <>
            <Field label="Agent model type">
              <Dropdown
                id="agent-model-type"
                value={formData.agentModelType}
                selectedOptions={[formData.agentModelType]}
                onOptionSelect={(_e, data) => updateFormField('agentModelType', data.optionValue as string)}
              >
                <Option value="AzureOpenAI">AzureOpenAI</Option>
                <Option value="FoundryAgentService">FoundryAgentService</Option>
              </Dropdown>
            </Field>

            <Field label="Deployment ID (optional)">
              <Input
                id="deployment-id"
                value={formData.deploymentId}
                onChange={(_e, data) => updateFormField('deploymentId', data.value)}
                placeholder="Enter deployment identifier"
              />
            </Field>

            <Field label="Model connection reference (optional)">
              <Input
                id="model-ref"
                value={formData.modelReferenceName}
                onChange={(_e, data) => updateFormField('modelReferenceName', data.value)}
                placeholder="Enter model connection reference name"
              />
            </Field>

            <Field label="Deployment model name (optional)">
              <Input
                id="model-name"
                value={formData.modelName}
                onChange={(_e, data) => updateFormField('modelName', data.value)}
                placeholder="Enter deployment model name"
              />
            </Field>
          </>
        )}

        {/* Ground truth fields */}
        {(formData.template === 'ToolCallTrajectory' || formData.template === 'SemanticSimilarity') && (
          <>
            <RadioGroup
              value={formData.useGroundTruthRun ? 'groundTruth' : 'manual'}
              onChange={(_e, data) => updateFormField('useGroundTruthRun', data.value === 'groundTruth')}
            >
              <Radio
                value="manual"
                label={formData.template === 'ToolCallTrajectory' ? 'Provide expected tool calls' : 'Provide expected response'}
              />
              <Radio value="groundTruth" label="Use ground truth run" />
            </RadioGroup>

            {formData.useGroundTruthRun && (
              <>
                <Field label="Ground truth run ID">
                  <Input
                    id="ground-truth-run"
                    value={formData.groundTruthRunId}
                    onChange={(_e, data) => updateFormField('groundTruthRunId', data.value)}
                    placeholder="Enter ground truth run identifier"
                  />
                </Field>
                <Field label="Ground truth agent action (optional)">
                  <Input
                    id="ground-truth-action"
                    value={formData.groundTruthAgentActionName}
                    onChange={(_e, data) => updateFormField('groundTruthAgentActionName', data.value)}
                    placeholder="Enter ground truth agent action name"
                  />
                </Field>
              </>
            )}
          </>
        )}

        {/* CustomPrompt: Instructions */}
        {formData.template === 'CustomPrompt' && (
          <Field label="Instructions">
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(_e, data) => updateFormField('prompt', data.value)}
              placeholder="Enter evaluation instructions"
              rows={4}
            />
          </Field>
        )}

        {/* ToolCallTrajectory: Expected Tool Calls */}
        {formData.template === 'ToolCallTrajectory' && !formData.useGroundTruthRun && (
          <Field label="Expected Tool Calls">
            <div className={styles.toolCallsListEditable}>
              {formData.expectedToolCalls.map((toolCall, index) => (
                <div key={index} className={styles.toolCallItem}>
                  <div className={styles.toolCallHeader}>
                    <Text size={200} weight="semibold">
                      Tool Call #{index + 1}
                    </Text>
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      size="small"
                      onClick={() => {
                        const newToolCalls = formData.expectedToolCalls.filter((_, i) => i !== index);
                        updateFormField('expectedToolCalls', newToolCalls);
                      }}
                    />
                  </div>
                  <Input
                    value={toolCall.name}
                    onChange={(_e, data) => {
                      const newToolCalls = [...formData.expectedToolCalls];
                      newToolCalls[index] = { ...toolCall, name: data.value };
                      updateFormField('expectedToolCalls', newToolCalls);
                    }}
                    placeholder="Tool name"
                    size="small"
                    style={{ width: '100%' }}
                  />
                  <Textarea
                    value={toolCall.arguments}
                    onChange={(_e, data) => {
                      const newToolCalls = [...formData.expectedToolCalls];
                      newToolCalls[index] = { ...toolCall, arguments: data.value };
                      updateFormField('expectedToolCalls', newToolCalls);
                    }}
                    placeholder='Arguments (JSON): {"key": "value"}'
                    rows={2}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
              <Button
                appearance="subtle"
                icon={<AddRegular />}
                size="small"
                onClick={() => {
                  updateFormField('expectedToolCalls', [...formData.expectedToolCalls, createDefaultToolCallFormItem()]);
                }}
              >
                Add Tool Call
              </Button>
            </div>
          </Field>
        )}

        {/* ToolCallTrajectory: Optional settings */}
        {formData.template === 'ToolCallTrajectory' && (
          <>
            <div className={styles.formRow}>
              <div className={styles.formFieldHalf}>
                <Field label="Threshold (optional)">
                  <Input
                    id="threshold"
                    type="number"
                    value={formData.threshold}
                    onChange={(_e, data) => updateFormField('threshold', data.value)}
                    placeholder="e.g., 0.8"
                  />
                </Field>
              </div>
              <div className={styles.formFieldHalf}>
                <Field label="Comparison Method">
                  <Dropdown
                    id="comparison"
                    value={formData.comparisonMethod}
                    selectedOptions={[formData.comparisonMethod]}
                    onOptionSelect={(_e, data) => updateFormField('comparisonMethod', data.optionValue as ComparisonMethod)}
                  >
                    <Option value="exact">Exact</Option>
                    <Option value="in-order">In-order</Option>
                    <Option value="any-order">Any-order</Option>
                    <Option value="precision">Precision</Option>
                    <Option value="recall">Recall</Option>
                  </Dropdown>
                </Field>
              </div>
            </div>
            <Checkbox
              checked={formData.shouldCompareArgs}
              onChange={(_e, data) => updateFormField('shouldCompareArgs', !!data.checked)}
              label="Compare Arguments"
            />
          </>
        )}

        {/* SemanticSimilarity: Expected response */}
        {formData.template === 'SemanticSimilarity' && !formData.useGroundTruthRun && (
          <Field label="Expected Chat Response">
            <Textarea
              id="expected-response"
              value={formData.expectedChatResponse}
              onChange={(_e, data) => updateFormField('expectedChatResponse', data.value)}
              placeholder="Enter the expected chat response"
              rows={4}
            />
          </Field>
        )}
      </div>

      <div className={styles.formActions}>
        <Button appearance="secondary" onClick={() => dispatch(cancelFormAction())}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          icon={isModifyingEvaluator ? <Spinner size="extra-tiny" /> : <SaveRegular />}
          onClick={handleSubmit}
          disabled={isModifyingEvaluator || !isEvaluationDataSelected}
        >
          Save
        </Button>
      </div>
    </div>
  );
};
