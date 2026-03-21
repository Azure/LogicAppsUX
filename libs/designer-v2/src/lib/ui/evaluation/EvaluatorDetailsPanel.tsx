import { Badge, Button, Card, Caption1, Caption1Strong, Spinner, Text, Tooltip } from '@fluentui/react-components';
import { EditRegular, PlayRegular, DeleteRegular } from '@fluentui/react-icons';
import type { Evaluator } from '@microsoft/logic-apps-shared';
import { useSelectedEvaluationAgentName, useEvaluationDataSelected } from '../../core/state/evaluation/evaluationSelectors';
import { setRightPanelView, setRunningEvaluatorName } from '../../core/state/evaluation/evaluationSlice';
import { useEvaluation, useRunEvaluation } from '../../core/queries/evaluations';
import { useEvaluateViewStyles } from './EvaluateView.styles';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';

interface EvaluatorDetailsPanelProps {
  workflowName: string;
  evaluator: Evaluator;
  onEdit: () => void;
  onDelete: () => void;
}

export const EvaluatorDetailsPanel = ({ workflowName, evaluator, onEdit, onDelete }: EvaluatorDetailsPanelProps) => {
  const styles = useEvaluateViewStyles();
  const dispatch = useDispatch();
  const selectedRun = useRunInstance();
  const selectedAgentName = useSelectedEvaluationAgentName();
  const isEvaluationDataSelected = useEvaluationDataSelected();

  const { mutateAsync: runEvaluation } = useRunEvaluation(workflowName, selectedAgentName ?? '');

  const handleRunEvaluation = useCallback(async () => {
    if (!selectedRun) {
      return;
    }
    dispatch(setRightPanelView('result'));
    dispatch(setRunningEvaluatorName(evaluator.name));
    await runEvaluation({
      runId: selectedRun.name,
      evaluatorName: evaluator.name,
    });
  }, [dispatch, selectedRun, evaluator.name, runEvaluation]);

  const { data: evaluation, isFetching: isEvaluationFetching } = useEvaluation(
    workflowName,
    selectedRun?.name ?? '',
    selectedAgentName ?? '',
    evaluator.name
  );
  const isEvalPassed = evaluation?.result?.toLowerCase() === 'passed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.panelHeader}>
        <div>
          <Text size={400} weight="semibold" as="h2">
            Evaluator Details
          </Text>
          <Caption1 block style={{ marginTop: '4px' }}>
            {evaluator.name}
          </Caption1>
        </div>
      </div>

      <div className={styles.formContent}>
        {/* Evaluator Definition */}
        <Card>
          <div className={styles.fieldRow}>
            <Caption1Strong>Evaluator name</Caption1Strong>
            <Text size={300}>{evaluator.name}</Text>
          </div>

          <div className={styles.fieldRow}>
            <Caption1Strong>Template</Caption1Strong>
            <Text size={300}>{evaluator.template === 'CustomPrompt' ? 'Custom Prompt' : evaluator.template}</Text>
          </div>

          {evaluator.template !== 'ToolCallTrajectory' && (
            <>
              {evaluator.deploymentId && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Deployment ID</Caption1Strong>
                  <Text size={300}>{evaluator.deploymentId}</Text>
                </div>
              )}

              {evaluator.agentModelType && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Agent model type</Caption1Strong>
                  <Text size={300}>{evaluator.agentModelType}</Text>
                </div>
              )}

              {evaluator.modelConfiguration?.referenceName && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Model connection reference</Caption1Strong>
                  <Text size={300}>{evaluator.modelConfiguration.referenceName}</Text>
                </div>
              )}

              {evaluator.agentModelSettings?.deploymentModelProperties?.name && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Deployment model name</Caption1Strong>
                  <Text size={300}>{evaluator.agentModelSettings.deploymentModelProperties.name}</Text>
                </div>
              )}
            </>
          )}

          {evaluator.groundTruthRunId && (
            <div className={styles.fieldRow}>
              <Caption1Strong>Ground truth run ID</Caption1Strong>
              <Text size={300}>{evaluator.groundTruthRunId}</Text>
            </div>
          )}

          {evaluator.groundTruthAgentActionName && (
            <div className={styles.fieldRow}>
              <Caption1Strong>Ground truth agent action</Caption1Strong>
              <Text size={300}>{evaluator.groundTruthAgentActionName}</Text>
            </div>
          )}

          {/* Template-specific parameters */}
          {evaluator.template === 'CustomPrompt' && evaluator.parameters.prompt && (
            <div className={styles.fieldRow}>
              <Caption1Strong>Instructions</Caption1Strong>
              <div className={styles.promptValue}>{evaluator.parameters.prompt}</div>
            </div>
          )}

          {evaluator.template === 'ToolCallTrajectory' && (
            <>
              {evaluator.parameters.expectedToolCalls && evaluator.parameters.expectedToolCalls.length > 0 && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Expected Tool Calls</Caption1Strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {evaluator.parameters.expectedToolCalls.map((tc, idx) => (
                      <div key={idx} className={styles.toolCallItem}>
                        <div className={styles.toolCallHeader}>
                          <Text size={200} weight="semibold">
                            {tc.name}
                          </Text>
                        </div>
                        {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                          <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(tc.arguments, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluator.parameters.comparisonMethod && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Comparison method</Caption1Strong>
                  <Text size={300}>{evaluator.parameters.comparisonMethod}</Text>
                </div>
              )}

              {evaluator.parameters.threshold !== undefined && (
                <div className={styles.fieldRow}>
                  <Caption1Strong>Threshold</Caption1Strong>
                  <Text size={300}>{evaluator.parameters.threshold}</Text>
                </div>
              )}

              <div className={styles.fieldRow}>
                <Caption1Strong>Compare arguments</Caption1Strong>
                <Text size={300}>{evaluator.parameters.shouldCompareArgs ? 'Yes' : 'No'}</Text>
              </div>
            </>
          )}

          {evaluator.template === 'SemanticSimilarity' && evaluator.parameters.expectedChatResponse && (
            <div className={styles.fieldRow}>
              <Caption1Strong>Expected Chat Response</Caption1Strong>
              <div className={styles.promptValue}>{evaluator.parameters.expectedChatResponse}</div>
            </div>
          )}

          <div className={styles.definitionActions}>
            <Tooltip content="Edit evaluator" relationship="label">
              <Button appearance="secondary" icon={<EditRegular />} onClick={onEdit}>
                Edit
              </Button>
            </Tooltip>
            <Tooltip content={isEvaluationDataSelected ? 'Run evaluation' : 'Select a run first'} relationship="label">
              <Button appearance="primary" icon={<PlayRegular />} onClick={handleRunEvaluation} disabled={!isEvaluationDataSelected}>
                Run
              </Button>
            </Tooltip>
            <Tooltip content="Delete evaluator" relationship="label">
              <Button appearance="subtle" icon={<DeleteRegular />} onClick={onDelete}>
                Delete
              </Button>
            </Tooltip>
          </div>
        </Card>

        {/* Last Evaluation Result */}
        {selectedRun && (
          <Card>
            {isEvaluationFetching ? (
              <div className={styles.loadingContainer}>
                <Spinner size="small" label="Loading evaluation..." />
              </div>
            ) : evaluation ? (
              <>
                <div className={styles.evaluationHeader}>
                  <Text size={400} weight="semibold">
                    Last Evaluation
                  </Text>
                  <Badge appearance="tint" color={isEvalPassed ? 'success' : 'danger'} shape="rounded" size="medium">
                    {evaluation.result}
                  </Badge>
                </div>

                <div className={styles.resultSection}>
                  <div className={styles.detailRow}>
                    <Caption1>Status</Caption1>
                    <Text size={300} weight="semibold" className={isEvalPassed ? styles.statusSucceeded : styles.statusFailed}>
                      {evaluation.result}
                    </Text>
                  </div>
                  <div className={styles.detailRow}>
                    <Caption1>Value</Caption1>
                    <Text size={300} weight="semibold">
                      {evaluation.value}
                    </Text>
                  </div>
                  {evaluation.agentActionName && (
                    <div className={styles.detailRow}>
                      <Caption1>Agent Action</Caption1>
                      <Text size={300} weight="semibold">
                        {evaluation.agentActionName}
                      </Text>
                    </div>
                  )}
                </div>

                {evaluation.reason && (
                  <div style={{ marginTop: '8px' }}>
                    <Caption1Strong>Reason</Caption1Strong>
                    <div className={styles.resultReason}>{evaluation.reason}</div>
                  </div>
                )}

                <div className={styles.tokenStats}>
                  <div className={styles.tokenStat}>
                    <Caption1>Total Tokens</Caption1>
                    <Text size={400} weight="semibold">
                      {evaluation.totalTokens}
                    </Text>
                  </div>
                  <div className={styles.tokenStat}>
                    <Caption1>Input Tokens</Caption1>
                    <Text size={400} weight="semibold">
                      {evaluation.inputTokens}
                    </Text>
                  </div>
                  <div className={styles.tokenStat}>
                    <Caption1>Output Tokens</Caption1>
                    <Text size={400} weight="semibold">
                      {evaluation.outputTokens}
                    </Text>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Text size={300} weight="semibold">
                  No evaluation results for this run
                </Text>
                <Text size={200}>Click Run to evaluate</Text>
              </div>
            )}
          </Card>
        )}

        {!selectedRun && (
          <div className={styles.emptyState}>
            <Text size={300} weight="semibold">
              Select a run to view evaluation results
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};
