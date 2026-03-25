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
import { DeleteRegular, AddRegular, SaveRegular, DismissRegular, PlugConnectedRegular } from '@fluentui/react-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  finishFormAction,
  cancelFormAction,
  startSelectConnection,
  clearPendingFormData,
} from '../../core/state/evaluation/evaluationSlice';
import {
  useSelectedEvaluator,
  useEvaluationViewMode,
  useSelectedEvaluationAgentName,
  useEvaluationDataSelected,
  usePendingFormData,
} from '../../core/state/evaluation/evaluationSelectors';
import { useCreateOrUpdateEvaluator, useEvaluators } from '../../core/queries/evaluations';
import { equals, EvaluatorTemplate, evaluatorTemplateDisplayMap, ToolCallComparisonMethod } from '@microsoft/logic-apps-shared';
import type { EvaluatorFormData } from './evaluatorFormHelpers';
import {
  createDefaultEvaluatorFormData,
  evaluatorToFormData,
  formDataToEvaluator,
  createDefaultToolCallFormItem,
  isModelAsJudgeEvaluator,
  isGroundTruthEvaluator,
} from './evaluatorFormHelpers';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { EvaluationViewMode } from '../../core/state/evaluation/evaluationInterfaces';
import type { RootState } from '../../core/store';
import { useConnectionsForConnector } from '../../core/queries/connections';
import { getCognitiveServiceAccountDeploymentsForConnection } from '../panel/connectionsPanel/createConnection/custom/useCognitiveService';
import constants from '../../common/constants';
import { useQuery } from '@tanstack/react-query';

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

  const pendingFormData = usePendingFormData();

  const [formData, setFormData] = useState<EvaluatorFormData>(createDefaultEvaluatorFormData());
  const [error, setError] = useState<string | null>(null);

  // Fetch the selected connection to get deployments for AI Model dropdown
  const connectionReferences = useSelector((state: RootState) => state.connections.connectionReferences);
  const selectedConnectionRef = formData.connectionReferenceKey ? connectionReferences[formData.connectionReferenceKey] : undefined;
  const { data: allConnections } = useConnectionsForConnector(selectedConnectionRef ? selectedConnectionRef.api.id : '');
  const selectedConnection = useMemo(
    () => allConnections?.find((c) => selectedConnectionRef && equals(c.id, selectedConnectionRef.connection.id, true)),
    [allConnections, selectedConnectionRef]
  );
  const { data: deployments, isLoading: isLoadingDeployments } = useQuery(
    ['evaluator-deployments', selectedConnection?.id],
    () => (selectedConnection ? getCognitiveServiceAccountDeploymentsForConnection(selectedConnection) : Promise.resolve([])),
    { enabled: !!selectedConnection }
  );
  const deploymentOptions = useMemo<Array<{ value: string; displayName: string }>>(() => {
    if (!deployments) {
      return [];
    }
    return deployments
      .filter((d: any) => constants.SUPPORTED_AGENT_MODELS.includes((d.properties?.model?.name ?? '').toLowerCase()))
      .map((d: any) => ({
        value: d.name as string,
        displayName: `${d.name}${d.properties?.model?.name ? ` (${d.properties.model.name})` : ''}`,
      }));
  }, [deployments]);

  useEffect(() => {
    if (viewMode === EvaluationViewMode.EditEvaluator && selectedEvaluator) {
      setFormData(evaluatorToFormData(selectedEvaluator));
    } else {
      setFormData(createDefaultEvaluatorFormData());
    }
  }, [viewMode, selectedEvaluator]);

  // Restore form data when returning from connection selection
  useEffect(() => {
    if (pendingFormData) {
      setFormData(pendingFormData as EvaluatorFormData);
      dispatch(clearPendingFormData());
    }
  }, [pendingFormData, dispatch]);

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

    if (isModelAsJudgeEvaluator(formData.template) && !formData.connectionReferenceKey) {
      setError('An agent connection is required');
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
            value={evaluatorTemplateDisplayMap[formData.template]}
            selectedOptions={[formData.template]}
            onOptionSelect={(_e, data) => updateFormField('template', data.optionValue as EvaluatorTemplate)}
          >
            <Option value={EvaluatorTemplate.CustomPrompt}>Custom Prompt</Option>
            <Option value={EvaluatorTemplate.ToolCallTrajectory}>Tool Call Trajectory</Option>
            <Option value={EvaluatorTemplate.SemanticSimilarity}>Semantic Similarity</Option>
          </Dropdown>
        </Field>

        {/* Agent connection */}
        {isModelAsJudgeEvaluator(formData.template) && (
          <Field label="Agent connection" required>
            {formData.connectionReferenceKey ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text size={200}>
                  {formData.connectionReferenceKey}
                  {formData.agentModelType ? ` (${formData.agentModelType})` : ''}
                </Text>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<PlugConnectedRegular />}
                  onClick={() => dispatch(startSelectConnection(formData))}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button appearance="secondary" icon={<PlugConnectedRegular />} onClick={() => dispatch(startSelectConnection(formData))}>
                Select connection
              </Button>
            )}
          </Field>
        )}

        {/* AI Model - shown when a connection is selected for LLM-as-judge eval */}
        {isModelAsJudgeEvaluator(formData.template) && formData.connectionReferenceKey && (
          <Field label="AI Model">
            {isLoadingDeployments ? (
              <Spinner size="tiny" label="Loading deployments..." />
            ) : deploymentOptions.length > 0 ? (
              <Dropdown
                id="ai-model"
                value={
                  formData.deploymentId
                    ? (deploymentOptions.find((o) => o.value === formData.deploymentId)?.displayName ?? formData.deploymentId)
                    : ''
                }
                selectedOptions={formData.deploymentId ? [formData.deploymentId] : []}
                onOptionSelect={(_e, data) => {
                  const value = data.optionValue as string;
                  setFormData((prev) => ({ ...prev, deploymentId: value, modelName: value }));
                }}
                placeholder="Select a deployment"
              >
                {deploymentOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value} text={opt.displayName}>
                    {opt.displayName}
                  </Option>
                ))}
              </Dropdown>
            ) : (
              <Input
                id="ai-model-manual"
                value={formData.deploymentId}
                onChange={(_e, data) => {
                  setFormData((prev) => ({ ...prev, deploymentId: data.value, modelName: data.value }));
                }}
                placeholder="Enter deployment name"
              />
            )}
          </Field>
        )}

        {/* Ground truth fields */}
        {isGroundTruthEvaluator(formData.template) && (
          <>
            <RadioGroup
              value={formData.useGroundTruthRun ? 'groundTruth' : 'manual'}
              onChange={(_e, data) => updateFormField('useGroundTruthRun', data.value === 'groundTruth')}
            >
              <Radio
                value="manual"
                label={
                  formData.template === EvaluatorTemplate.ToolCallTrajectory ? 'Provide expected tool calls' : 'Provide expected response'
                }
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
        {formData.template === EvaluatorTemplate.CustomPrompt && (
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
        {formData.template === EvaluatorTemplate.ToolCallTrajectory && !formData.useGroundTruthRun && (
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
        {formData.template === EvaluatorTemplate.ToolCallTrajectory && (
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
                    onOptionSelect={(_e, data) => updateFormField('comparisonMethod', data.optionValue as ToolCallComparisonMethod)}
                  >
                    <Option value={ToolCallComparisonMethod.Exact}>Exact</Option>
                    <Option value={ToolCallComparisonMethod.InOrder}>In-order</Option>
                    <Option value={ToolCallComparisonMethod.AnyOrder}>Any-order</Option>
                    <Option value={ToolCallComparisonMethod.Precision}>Precision</Option>
                    <Option value={ToolCallComparisonMethod.Recall}>Recall</Option>
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
        {formData.template === EvaluatorTemplate.SemanticSimilarity && !formData.useGroundTruthRun && (
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
