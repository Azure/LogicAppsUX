import { useState, useEffect, useCallback } from 'react';
import { Button, Dropdown, Input, Label, Option, Radio, RadioGroup, Checkbox, Textarea, Spinner } from '@fluentui/react-components';
import { DeleteRegular, AddRegular, SaveRegular } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import { finishFormAction, cancelFormAction } from '../../core/state/evaluation/evaluationSlice';
import { useEditingEvaluator, useRightPanelView } from '../../core/state/evaluation/evaluationSelectors';
import { useCreateOrUpdateEvaluator } from '../../core/queries/evaluations';
import type { EvaluatorTemplate, ComparisonMethod } from '@microsoft/logic-apps-shared';
import type { EvaluatorFormData } from './evaluatorFormHelpers';
import {
  createDefaultEvaluatorFormData,
  evaluatorToFormData,
  formDataToEvaluator,
  createDefaultToolCallFormItem,
} from './evaluatorFormHelpers';
import { useEvaluateViewStyles } from './EvaluateView.styles';

interface EvaluatorFormPanelProps {
  workflowName: string;
}

export const EvaluatorFormPanel = ({ workflowName }: EvaluatorFormPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const rightPanelView = useRightPanelView();
  const editingEvaluator = useEditingEvaluator();
  const mode = rightPanelView === 'edit' ? 'edit' : 'create';
  const createOrUpdate = useCreateOrUpdateEvaluator(workflowName);

  const [formData, setFormData] = useState<EvaluatorFormData>(createDefaultEvaluatorFormData());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && editingEvaluator) {
      setFormData(evaluatorToFormData(editingEvaluator));
    } else {
      setFormData(createDefaultEvaluatorFormData());
    }
  }, [mode, editingEvaluator]);

  const updateFormField = useCallback(<K extends keyof EvaluatorFormData>(field: K, value: EvaluatorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Evaluator name is required');
      return;
    }

    setError(null);
    try {
      const evalData = formDataToEvaluator(formData);
      await createOrUpdate.mutateAsync({ evaluatorName: formData.name, evaluator: evalData });
      dispatch(finishFormAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evaluator');
    }
  }, [formData, createOrUpdate, dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>{mode === 'create' ? 'Create Evaluator' : 'Edit Evaluator'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--colorNeutralForeground2)' }}>
            {mode === 'create' ? 'Configure a new evaluator for your agent' : 'Update evaluator configuration'}
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.formError}>
          <span>{error}</span>
          <Button appearance="subtle" size="small" onClick={() => setError(null)}>
            ×
          </Button>
        </div>
      )}

      <div className={styles.formContent}>
        <div>
          <Label htmlFor="evaluator-name">Name</Label>
          <Input
            id="evaluator-name"
            value={formData.name}
            onChange={(_e, data) => updateFormField('name', data.value)}
            placeholder="Enter evaluator name"
            disabled={mode === 'edit'}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <Label htmlFor="evaluator-template">Template</Label>
          <Dropdown
            id="evaluator-template"
            selectedOptions={[formData.template]}
            onOptionSelect={(_e, data) => updateFormField('template', data.optionValue as EvaluatorTemplate)}
            style={{ width: '100%' }}
          >
            <Option value="CustomPrompt">Custom Prompt</Option>
            <Option value="ToolCallTrajectory">Tool Call Trajectory</Option>
            <Option value="SemanticSimilarity">Semantic Similarity</Option>
          </Dropdown>
        </div>

        {/* Model configuration - not needed for ToolCallTrajectory */}
        {formData.template !== 'ToolCallTrajectory' && (
          <>
            <div>
              <Label htmlFor="agent-model-type">Agent model type</Label>
              <Dropdown
                id="agent-model-type"
                value={formData.agentModelType}
                selectedOptions={[formData.agentModelType]}
                onOptionSelect={(_e, data) => updateFormField('agentModelType', data.optionValue as string)}
                style={{ width: '100%' }}
              >
                <Option value="AzureOpenAI">AzureOpenAI</Option>
                <Option value="FoundryAgentService">FoundryAgentService</Option>
              </Dropdown>
            </div>

            <div>
              <Label htmlFor="deployment-id">Deployment ID (optional)</Label>
              <Input
                id="deployment-id"
                value={formData.deploymentId}
                onChange={(_e, data) => updateFormField('deploymentId', data.value)}
                placeholder="Enter deployment identifier"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <Label htmlFor="model-ref">Model connection reference (optional)</Label>
              <Input
                id="model-ref"
                value={formData.modelReferenceName}
                onChange={(_e, data) => updateFormField('modelReferenceName', data.value)}
                placeholder="Enter model connection reference name"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <Label htmlFor="model-name">Deployment model name (optional)</Label>
              <Input
                id="model-name"
                value={formData.modelName}
                onChange={(_e, data) => updateFormField('modelName', data.value)}
                placeholder="Enter deployment model name"
                style={{ width: '100%' }}
              />
            </div>
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
                <div>
                  <Label htmlFor="ground-truth-run">Ground truth run ID</Label>
                  <Input
                    id="ground-truth-run"
                    value={formData.groundTruthRunId}
                    onChange={(_e, data) => updateFormField('groundTruthRunId', data.value)}
                    placeholder="Enter ground truth run identifier"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <Label htmlFor="ground-truth-action">Ground truth agent action (optional)</Label>
                  <Input
                    id="ground-truth-action"
                    value={formData.groundTruthAgentActionName}
                    onChange={(_e, data) => updateFormField('groundTruthAgentActionName', data.value)}
                    placeholder="Enter ground truth agent action name"
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* CustomPrompt: Instructions */}
        {formData.template === 'CustomPrompt' && (
          <div>
            <Label htmlFor="prompt">Instructions</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(_e, data) => updateFormField('prompt', data.value)}
              placeholder="Enter evaluation instructions"
              rows={4}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* ToolCallTrajectory: Expected Tool Calls */}
        {formData.template === 'ToolCallTrajectory' && !formData.useGroundTruthRun && (
          <div>
            <Label>Expected Tool Calls</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {formData.expectedToolCalls.map((toolCall, index) => (
                <div key={index} className={styles.toolCallItem}>
                  <div className={styles.toolCallHeader}>
                    <span>Tool Call #{index + 1}</span>
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
          </div>
        )}

        {/* ToolCallTrajectory: Optional settings */}
        {formData.template === 'ToolCallTrajectory' && (
          <>
            <div className={styles.formRow}>
              <div className={styles.formFieldHalf}>
                <Label htmlFor="threshold">Threshold (optional)</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={(_e, data) => updateFormField('threshold', data.value)}
                  placeholder="e.g., 0.8"
                  style={{ width: '100%' }}
                />
              </div>
              <div className={styles.formFieldHalf}>
                <Label htmlFor="comparison">Comparison Method</Label>
                <Dropdown
                  id="comparison"
                  value={formData.comparisonMethod}
                  selectedOptions={[formData.comparisonMethod]}
                  onOptionSelect={(_e, data) => updateFormField('comparisonMethod', data.optionValue as ComparisonMethod)}
                  style={{ width: '100%' }}
                >
                  <Option value="exact">Exact</Option>
                  <Option value="in-order">In-order</Option>
                  <Option value="any-order">Any-order</Option>
                  <Option value="precision">Precision</Option>
                  <Option value="recall">Recall</Option>
                </Dropdown>
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
          <div>
            <Label htmlFor="expected-response">Expected Chat Response</Label>
            <Textarea
              id="expected-response"
              value={formData.expectedChatResponse}
              onChange={(_e, data) => updateFormField('expectedChatResponse', data.value)}
              placeholder="Enter the expected chat response"
              rows={4}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <Button appearance="secondary" onClick={() => dispatch(cancelFormAction())}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          icon={createOrUpdate.isLoading ? <Spinner size="extra-tiny" /> : <SaveRegular />}
          onClick={handleSubmit}
          disabled={createOrUpdate.isLoading}
        >
          Save
        </Button>
      </div>
    </div>
  );
};
